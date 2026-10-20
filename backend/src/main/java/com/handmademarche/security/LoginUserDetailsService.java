package com.handmademarche.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.handmademarche.repository.UserRepository;

/**
 * Spring Security がログイン時に呼び出す、利用者の読み込み処理。
 * ログインIDで users テーブルを検索し、パスワードの照合は Spring Security に任せる。
 */
@Service
public class LoginUserDetailsService implements UserDetailsService {

	private final UserRepository userRepository;

	public LoginUserDetailsService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public UserDetails loadUserByUsername(String loginId) throws UsernameNotFoundException {
		return userRepository.findByLoginId(loginId)
				.map(user -> org.springframework.security.core.userdetails.User
						.withUsername(user.getLoginId())
						.password(user.getPassword())
						.roles("USER")
						.build())
				.orElseThrow(() -> new UsernameNotFoundException("利用者が見つかりません: " + loginId));
	}
}
