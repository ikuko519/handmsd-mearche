package com.handmademarche.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * ログインAPIのリクエスト。
 */
public record LoginRequest(

		/** ログインID */
		@NotBlank(message = "ログインIDを入力してください")
		String loginId,

		/** パスワード */
		@NotBlank(message = "パスワードを入力してください")
		String password) {
}
