package com.handmademarche.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.handmademarche.entity.User;

/**
 * 利用者のデータベース操作。
 */
public interface UserRepository extends JpaRepository<User, Long> {

	/** ログインIDで利用者を探す */
	Optional<User> findByLoginId(String loginId);
}
