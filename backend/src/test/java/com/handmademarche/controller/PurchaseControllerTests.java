package com.handmademarche.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.handmademarche.entity.Product;
import com.handmademarche.entity.Purchase;
import com.handmademarche.entity.User;
import com.handmademarche.repository.ProductRepository;
import com.handmademarche.repository.PurchaseRepository;
import com.handmademarche.repository.UserRepository;

import jakarta.persistence.EntityManager;

/**
 * 購入登録・購入結果取得APIのテスト。本番用のDBファイルを汚さないよう、メモリ上のH2を使う。
 * 購入者 buyer1 と、別の利用者 buyer2 をテストごとに作成する。
 */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:purchasetestdb")
@Transactional
class PurchaseControllerTests {

	private MockMvc mockMvc;

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private PurchaseRepository purchaseRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private EntityManager entityManager;

	private User buyer1;
	private User buyer2;
	private Product product;

	/** すべてのリクエストを「buyer1 でログイン済み・CSRFトークン付き」で送るようにする */
	@BeforeEach
	void setUp(WebApplicationContext context) {
		mockMvc = MockMvcBuilders.webAppContextSetup(context)
				.apply(springSecurity())
				.defaultRequest(get("/").with(user("buyer1")).with(csrf()))
				.build();
		// パスワードはこのテストでは使わないため、ハッシュ値の代わりにダミーの文字列を入れる
		buyer1 = userRepository.save(new User("buyer1", "dummy-hash"));
		buyer2 = userRepository.save(new User("buyer2", "dummy-hash"));
		product = productRepository.save(new Product("手編みのマフラー", 3500, "ウール100%です。"));
	}

	private ResultActions postPurchase(String body) throws Exception {
		return mockMvc.perform(post("/api/purchases").contentType(MediaType.APPLICATION_JSON).content(body));
	}

	// ---- 購入登録 POST /api/purchases ----

	@Test
	void 商品を購入できる() throws Exception {
		LocalDateTime before = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

		postPurchase("""
				{"productId": %d}
				""".formatted(product.getId()))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", matchesPattern("/api/purchases/\\d+")))
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.productId").value(product.getId()))
				.andExpect(jsonPath("$.productName").value("手編みのマフラー"))
				.andExpect(jsonPath("$.price").value(3500))
				// 購入日時は「2026-10-21T14:05:30」の形式
				.andExpect(jsonPath("$.purchaseDate", matchesPattern("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}")));

		// ログイン中の利用者の購入として、DBに保存されている
		entityManager.flush();
		entityManager.clear();
		List<Purchase> purchases = purchaseRepository.findAll();
		assertThat(purchases).hasSize(1);
		Purchase saved = purchases.get(0);
		assertThat(saved.getUser().getId()).isEqualTo(buyer1.getId());
		assertThat(saved.getProduct().getId()).isEqualTo(product.getId());
		assertThat(saved.getPurchaseDate()).isBetween(before, LocalDateTime.now());
	}

	@Test
	void 本文に利用者IDを指定しても購入者はログイン中の利用者になる() throws Exception {
		postPurchase("""
				{"productId": %d, "userId": %d}
				""".formatted(product.getId(), buyer2.getId()))
				.andExpect(status().isCreated());

		assertThat(purchaseRepository.findAll()).singleElement()
				.satisfies(p -> assertThat(p.getUser().getLoginId()).isEqualTo("buyer1"));
	}

	@Test
	void 同じ商品を続けて購入すると別々の購入情報になる() throws Exception {
		String body = """
				{"productId": %d}
				""".formatted(product.getId());
		postPurchase(body).andExpect(status().isCreated());
		postPurchase(body).andExpect(status().isCreated());

		assertThat(purchaseRepository.count()).isEqualTo(2);
	}

	@Test
	void 商品IDが未指定の場合は400エラーで購入されない() throws Exception {
		postPurchase("{}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("入力内容に誤りがあります"))
				.andExpect(jsonPath("$.errors.productId").value("購入する商品を選択してください"));

		assertThat(purchaseRepository.count()).isZero();
	}

	@Test
	void 商品IDが数値でない場合は400エラー() throws Exception {
		postPurchase("""
				{"productId": "abc"}
				""")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストの形式が正しくありません"));
	}

	@Test
	void 存在しない商品を購入しようとすると404エラーで購入されない() throws Exception {
		postPurchase("""
				{"productId": 999999}
				""")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("商品が見つかりません（ID: 999999）"));

		assertThat(purchaseRepository.count()).isZero();
	}

	@Test
	void CSRFトークンがない場合は403エラーで購入されない() throws Exception {
		mockMvc.perform(post("/api/purchases").with(csrf().useInvalidToken())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"productId": %d}
						""".formatted(product.getId())))
				.andExpect(status().isForbidden());

		assertThat(purchaseRepository.count()).isZero();
	}

	@Test
	void 未ログインの場合は401エラーで購入されない() throws Exception {
		mockMvc.perform(post("/api/purchases").with(anonymous())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"productId": %d}
						""".formatted(product.getId())))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value("ログインしてください"));

		assertThat(purchaseRepository.count()).isZero();
	}

	// ---- 購入結果取得 GET /api/purchases/{id} ----

	@Test
	void 自分の購入結果を取得できる() throws Exception {
		Purchase purchase = purchaseRepository.save(
				new Purchase(buyer1, product, LocalDateTime.of(2026, 10, 21, 14, 5, 30)));

		mockMvc.perform(get("/api/purchases/{id}", purchase.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(purchase.getId()))
				.andExpect(jsonPath("$.productId").value(product.getId()))
				.andExpect(jsonPath("$.productName").value("手編みのマフラー"))
				.andExpect(jsonPath("$.price").value(3500))
				.andExpect(jsonPath("$.purchaseDate").value("2026-10-21T14:05:30"));
	}

	@Test
	void 購入した結果をそのまま取得できる() throws Exception {
		String location = postPurchase("""
				{"productId": %d}
				""".formatted(product.getId()))
				.andReturn().getResponse().getHeader("Location");

		mockMvc.perform(get(location))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.productName").value("手編みのマフラー"));
	}

	@Test
	void 他の利用者の購入結果は403エラーで取得できない() throws Exception {
		Purchase others = purchaseRepository.save(new Purchase(buyer2, product, LocalDateTime.now()));

		mockMvc.perform(get("/api/purchases/{id}", others.getId()))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("この購入情報を表示する権限がありません"))
				.andExpect(jsonPath("$.productName").doesNotExist());
	}

	@Test
	void 存在しない購入IDの場合は404エラー() throws Exception {
		mockMvc.perform(get("/api/purchases/{id}", 999999))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("購入情報が見つかりません（ID: 999999）"));
	}

	@Test
	void 購入IDが数値でない場合は400エラー() throws Exception {
		mockMvc.perform(get("/api/purchases/abc"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void 未ログインの場合は購入結果を取得できず401エラー() throws Exception {
		Purchase purchase = purchaseRepository.save(new Purchase(buyer1, product, LocalDateTime.now()));

		mockMvc.perform(get("/api/purchases/{id}", purchase.getId()).with(anonymous()))
				.andExpect(status().isUnauthorized());
	}

	// ---- 購入された商品の削除 DELETE /api/products/{id} ----

	@Test
	void 購入された商品は409エラーで削除できない() throws Exception {
		purchaseRepository.save(new Purchase(buyer1, product, LocalDateTime.now()));

		mockMvc.perform(delete("/api/products/{id}", product.getId()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("購入された商品のため削除できません（ID: %d）".formatted(product.getId())));

		assertThat(productRepository.findById(product.getId())).isPresent();
	}

	@Test
	void 購入されていない商品は今までどおり削除できる() throws Exception {
		Product other = productRepository.save(new Product("木製スプーン", 1200, null));
		purchaseRepository.save(new Purchase(buyer1, product, LocalDateTime.now()));

		mockMvc.perform(delete("/api/products/{id}", other.getId()))
				.andExpect(status().isNoContent());

		assertThat(productRepository.findById(other.getId())).isEmpty();
	}
}
