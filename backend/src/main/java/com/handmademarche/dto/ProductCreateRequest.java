package com.handmademarche.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 商品登録APIのリクエスト。
 * id は自動採番のため受け取らない（Entityを直接受け取ると、id指定で既存商品を上書きできてしまうため）。
 */
public record ProductCreateRequest(

		/** 商品名 */
		@NotBlank(message = "商品名を入力してください")
		@Size(max = 100, message = "商品名は100文字以内で入力してください")
		String name,

		/** 価格（円） */
		@NotNull(message = "価格を入力してください")
		@Min(value = 0, message = "価格は0円以上で入力してください")
		Integer price,

		/** 商品説明（任意） */
		@Size(max = 1000, message = "商品説明は1000文字以内で入力してください")
		String description,

		/** 商品画像のURL（任意）。空でなければ http:// または https:// で始まること */
		@Size(max = 500, message = "画像URLは500文字以内で入力してください")
		@Pattern(regexp = "^(https?://\\S+)?$", message = "画像URLは http:// または https:// で始まるURLを入力してください")
		String imageUrl) {
}
