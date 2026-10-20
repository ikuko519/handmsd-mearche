package com.handmademarche.controller;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.handmademarche.dto.LoginRequest;
import com.handmademarche.dto.LoginUserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/**
 * ログインAPI。ログアウト（POST /api/logout）は SecurityConfig で設定している。
 */
@RestController
@RequestMapping("/api")
public class AuthController {

	private final AuthenticationManager authenticationManager;
	private final SecurityContextHolderStrategy securityContextHolderStrategy =
			SecurityContextHolder.getContextHolderStrategy();
	private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

	public AuthController(AuthenticationManager authenticationManager) {
		this.authenticationManager = authenticationManager;
	}

	/**
	 * POST /api/login : ログインIDとパスワードを照合し、成功したらセッションにログイン状態を保存する。
	 * 認証に失敗した場合は AuthenticationException が投げられ、ApiExceptionHandler で 401 になる。
	 */
	@PostMapping("/login")
	public LoginUserResponse login(@Valid @RequestBody LoginRequest loginRequest,
			HttpServletRequest request, HttpServletResponse response) {
		Authentication authentication = authenticationManager.authenticate(
				UsernamePasswordAuthenticationToken.unauthenticated(loginRequest.loginId(), loginRequest.password()));

		// セッション固定攻撃の対策：ログイン前のセッションがあれば、IDを新しくする
		if (request.getSession(false) != null) {
			request.changeSessionId();
		}

		SecurityContext context = securityContextHolderStrategy.createEmptyContext();
		context.setAuthentication(authentication);
		securityContextHolderStrategy.setContext(context);
		securityContextRepository.saveContext(context, request, response);

		return new LoginUserResponse(authentication.getName());
	}

	/** GET /api/me : ログイン中の利用者を返す（未ログインの場合は SecurityConfig により 401） */
	@GetMapping("/me")
	public LoginUserResponse me(@AuthenticationPrincipal UserDetails user) {
		return new LoginUserResponse(user.getUsername());
	}
}
