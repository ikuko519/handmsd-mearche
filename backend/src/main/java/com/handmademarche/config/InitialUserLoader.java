package com.handmademarche.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.handmademarche.entity.User;
import com.handmademarche.repository.UserRepository;

/**
 * 起動時に、利用者が1人もいなければ初期ユーザーを作成する（新規会員登録は今回の対象外のため）。
 * ログインID・パスワードは application.properties の app.initial-user.* で設定する。
 */
@Component
public class InitialUserLoader implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(InitialUserLoader.class);

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final String loginId;
	private final String password;

	public InitialUserLoader(UserRepository userRepository, PasswordEncoder passwordEncoder,
			@Value("${app.initial-user.login-id}") String loginId,
			@Value("${app.initial-user.password}") String password) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.loginId = loginId;
		this.password = password;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (userRepository.count() > 0) {
			return;
		}
		// パスワードはハッシュ化して保存する（平文は保存しない）
		userRepository.save(new User(loginId, passwordEncoder.encode(password)));
		log.info("初期ユーザーを作成しました（ログインID: {}）", loginId);
	}
}
