package com.handmademarche.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 利用者（購入者）。H2の users テーブルに対応する。
 * パスワードは BCrypt でハッシュ化した値を保存し、平文では保存しない。
 */
@Entity
@Table(name = "users")
public class User {

	/** 利用者ID（自動採番） */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** ログインID（重複不可） */
	@Column(nullable = false, unique = true, length = 50)
	private String loginId;

	/** パスワードのハッシュ値 */
	@Column(nullable = false, length = 100)
	private String password;

	/** JPAが使うため、引数なしコンストラクタが必要 */
	protected User() {
	}

	/**
	 * @param loginId ログインID
	 * @param passwordHash ハッシュ化済みのパスワード（平文を渡さないこと）
	 */
	public User(String loginId, String passwordHash) {
		this.loginId = loginId;
		this.password = passwordHash;
	}

	public Long getId() {
		return id;
	}

	public String getLoginId() {
		return loginId;
	}

	public String getPassword() {
		return password;
	}
}
