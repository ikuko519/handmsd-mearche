package com.handmademarche.dto;

import java.time.LocalDateTime;

import com.handmademarche.entity.Purchase;

/**
 * 購入登録API・購入結果取得APIのレスポンス。購入者の情報（パスワードなど）は含めない。
 */
public record PurchaseResponse(

		/** 購入ID */
		Long id,

		/** 購入した商品のID */
		Long productId,

		/** 購入した商品の商品名 */
		String productName,

		/** 購入した商品の価格（円） */
		Integer price,

		/** 購入日時 */
		LocalDateTime purchaseDate) {

	public static PurchaseResponse from(Purchase purchase) {
		return new PurchaseResponse(purchase.getId(), purchase.getProduct().getId(),
				purchase.getProduct().getName(), purchase.getProduct().getPrice(), purchase.getPurchaseDate());
	}
}
