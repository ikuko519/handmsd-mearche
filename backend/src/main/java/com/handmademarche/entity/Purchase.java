package com.handmademarche.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 購入情報。H2の purchases テーブルに対応する。
 * ER図のとおり、1件の購入は利用者1人・商品1点に紐づく（購入数量・在庫は扱わない）。
 */
@Entity
@Table(name = "purchases")
public class Purchase {

	/** 購入ID（自動採番） */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 購入した利用者 */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	/** 購入した商品 */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "product_id", nullable = false)
	private Product product;

	/** 購入日時 */
	@Column(nullable = false)
	private LocalDateTime purchaseDate;

	/** JPAが使うため、引数なしコンストラクタが必要 */
	protected Purchase() {
	}

	public Purchase(User user, Product product, LocalDateTime purchaseDate) {
		this.user = user;
		this.product = product;
		this.purchaseDate = purchaseDate;
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

	public Product getProduct() {
		return product;
	}

	public LocalDateTime getPurchaseDate() {
		return purchaseDate;
	}
}
