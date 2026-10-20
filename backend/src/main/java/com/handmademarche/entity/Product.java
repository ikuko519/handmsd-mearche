package com.handmademarche.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 商品。H2の products テーブルに対応する。
 */
@Entity
@Table(name = "products")
public class Product {

	/** 商品ID（自動採番） */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 商品名 */
	@NotBlank
	@Size(max = 100)
	@Column(nullable = false, length = 100)
	private String name;

	/** 価格（円） */
	@NotNull
	@Min(0)
	@Column(nullable = false)
	private Integer price;

	/** 商品説明 */
	@Size(max = 1000)
	@Column(length = 1000)
	private String description;

	/** JPAが使うため、引数なしコンストラクタが必要 */
	protected Product() {
	}

	public Product(String name, Integer price, String description) {
		this.name = name;
		this.price = price;
		this.description = description;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public Integer getPrice() {
		return price;
	}

	public void setPrice(Integer price) {
		this.price = price;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}
}
