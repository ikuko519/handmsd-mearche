package com.handmademarche.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.handmademarche.config.InitialUserLoader;
import com.handmademarche.entity.User;
import com.handmademarche.repository.UserRepository;

/**
 * ログイン・ログアウトAPIと、未ログイン時のアクセス制限のテスト。
 * 初期ユーザー（testuser / test-pass-123）は InitialUserLoader が起動時に作成する。
 */
@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:authtestdb",
		"app.initial-user.login-id=testuser",
		"app.initial-user.password=test-pass-123" })
class AuthControllerTests {

	private static final String LOGIN_FAILED = "ログインIDまたはパスワードが正しくありません";

	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private InitialUserLoader initialUserLoader;

	@BeforeEach
	void setUpMockMvc(WebApplicationContext context) {
		mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
	}

	/** ログインAPIを呼び、そのときのセッションを返す */
	private MockHttpSession login(String loginId, String password) throws Exception {
		return (MockHttpSession) mockMvc.perform(post("/api/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": "%s", "password": "%s"}
						""".formatted(loginId, password)))
				.andReturn().getRequest().getSession(false);
	}

	// ---- 初期ユーザー ----

	@Test
	void 起動時に初期ユーザーがハッシュ化したパスワードで作成される() {
		User user = userRepository.findByLoginId("testuser").orElseThrow();

		assertThat(user.getPassword()).isNotEqualTo("test-pass-123");
		assertThat(passwordEncoder.matches("test-pass-123", user.getPassword())).isTrue();
	}

	@Test
	void 利用者がいる場合は初期ユーザーを重複して作成しない() throws Exception {
		initialUserLoader.run(null);

		assertThat(userRepository.count()).isEqualTo(1);
	}

	// ---- ログイン POST /api/login ----

	@Test
	void 正しいログインIDとパスワードでログインでき_ログイン中の利用者を取得できる() throws Exception {
		MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": "testuser", "password": "test-pass-123"}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.loginId").value("testuser"))
				.andExpect(jsonPath("$.password").doesNotExist())
				.andReturn().getRequest().getSession(false);

		mockMvc.perform(get("/api/me").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.loginId").value("testuser"));
	}

	@Test
	void ログイン後は商品APIを利用できる() throws Exception {
		MockHttpSession session = login("testuser", "test-pass-123");

		mockMvc.perform(get("/api/products").session(session))
				.andExpect(status().isOk());
	}

	@Test
	void パスワードが違う場合は401エラーでログインできない() throws Exception {
		MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": "testuser", "password": "wrong-password"}
						"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value(LOGIN_FAILED))
				.andReturn().getRequest().getSession();

		mockMvc.perform(get("/api/me").session(session))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void 存在しないログインIDの場合もパスワード違いと同じ401エラー() throws Exception {
		mockMvc.perform(post("/api/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": "nobody", "password": "test-pass-123"}
						"""))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value(LOGIN_FAILED));
	}

	@Test
	void ログインIDとパスワードが未入力の場合は400エラー() throws Exception {
		mockMvc.perform(post("/api/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": " ", "password": ""}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.loginId").value("ログインIDを入力してください"))
				.andExpect(jsonPath("$.errors.password").value("パスワードを入力してください"));
	}

	@Test
	void CSRFトークンがないログインは403エラー() throws Exception {
		mockMvc.perform(post("/api/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": "testuser", "password": "test-pass-123"}
						"""))
				.andExpect(status().isForbidden());
	}

	@Test
	void ログインするとセッションIDが変わる() throws Exception {
		// ログイン前からあるセッション（攻撃者に知られている可能性がある）
		MockHttpSession before = new MockHttpSession();
		String beforeId = before.getId();

		mockMvc.perform(post("/api/login").with(csrf()).session(before)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"loginId": "testuser", "password": "test-pass-123"}
						"""))
				.andExpect(status().isOk());

		assertThat(before.getId()).isNotEqualTo(beforeId);
	}

	// ---- ログアウト POST /api/logout ----

	@Test
	void ログアウトするとログイン状態が解除される() throws Exception {
		MockHttpSession session = login("testuser", "test-pass-123");

		mockMvc.perform(post("/api/logout").with(csrf()).session(session))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/me").session(session))
				.andExpect(status().isUnauthorized());
	}

	// ---- 未ログイン時のアクセス制限 ----

	@Test
	void 未ログインでログイン中の利用者を取得すると401エラー() throws Exception {
		mockMvc.perform(get("/api/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value("ログインしてください"));
	}

	static Stream<MockHttpServletRequestBuilder> productApis() {
		String body = """
				{"name": "手編みのマフラー", "price": 3500}
				""";
		return Stream.of(
				get("/api/products"),
				get("/api/products/1"),
				post("/api/products").contentType(MediaType.APPLICATION_JSON).content(body),
				put("/api/products/1").contentType(MediaType.APPLICATION_JSON).content(body),
				delete("/api/products/1"));
	}

	@ParameterizedTest
	@MethodSource("productApis")
	void 未ログインでは商品APIを利用できず401エラー(MockHttpServletRequestBuilder request) throws Exception {
		mockMvc.perform(request.with(csrf()))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value("ログインしてください"));
	}

	@Test
	void 動作確認用APIはログインなしで利用できる() throws Exception {
		mockMvc.perform(get("/api/health"))
				.andExpect(status().isOk());
	}
}
