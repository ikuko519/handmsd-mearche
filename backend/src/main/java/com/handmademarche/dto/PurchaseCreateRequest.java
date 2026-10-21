package com.handmademarche.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 購入登録APIのリクエスト。
 * 購入者はログイン中の利用者とするため受け取らない（他人として購入できないようにするため）。
 */
public record PurchaseCreateRequest(

		/** 購入する商品のID */
		@NotNull(message = "購入する商品を選択してください")
		Long productId) {
}
