package com.handmademarche.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.handmademarche.entity.Purchase;

/**
 * 購入情報のデータベース操作。
 */
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

	/** 指定した商品の購入情報があるかどうか（購入された商品を削除できないようにするため） */
	boolean existsByProductId(Long productId);
}
