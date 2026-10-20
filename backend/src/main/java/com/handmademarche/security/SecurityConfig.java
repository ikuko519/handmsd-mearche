package com.handmademarche.security;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;

import jakarta.servlet.http.HttpServletResponse;

/**
 * ログイン（認証）の設定。
 *
 * - ログイン状態はサーバーのセッションで保持する（ブラウザには JSESSIONID の Cookie が渡る）
 * - /api/login・/api/health 以外のAPIは、ログインしていないと 401 を返す
 * - セッションCookieを使うため CSRF 対策を有効にする（React 側は XSRF-TOKEN Cookie の値を
 *   X-XSRF-TOKEN ヘッダーに付けて送る）
 */
@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/api/login", "/api/health", "/error").permitAll()
						// 開発用のH2コンソール（H2自体のユーザー名・パスワードで保護される）
						.requestMatchers("/h2-console/**").permitAll()
						.anyRequest().authenticated())
				.csrf(csrf -> csrf
						.spa()
						.ignoringRequestMatchers("/h2-console/**"))
				// H2コンソールは画面内でフレームを使うため、同じサイトからの表示だけ許可する
				.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
				.logout(logout -> logout
						.logoutUrl("/api/logout")
						.deleteCookies("JSESSIONID")
						.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
				.exceptionHandling(ex -> ex
						// 未ログイン：ログイン画面へ誘導できるよう 401 を返す
						.authenticationEntryPoint((request, response, e) ->
								writeJson(response, HttpStatus.UNAUTHORIZED, "ログインしてください"))
						// CSRFトークンがない・古い場合など
						.accessDeniedHandler((request, response, e) ->
								writeJson(response, HttpStatus.FORBIDDEN, "この操作は許可されていません。ページを再読み込みしてください")));
		return http.build();
	}

	/** パスワードのハッシュ化方式（BCrypt） */
	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	/** ログインIDとパスワードを照合する仕組み（AuthController から使う） */
	@Bean
	AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder);
		return new ProviderManager(provider);
	}

	/** エラーを他のAPIと同じ {"message": ...} 形式で返す */
	private static void writeJson(HttpServletResponse response, HttpStatus status, String message) throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write("{\"message\":\"" + message + "\"}");
	}
}
