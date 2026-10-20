package com.handmademarche.dto;

/**
 * ログイン中の利用者の情報（パスワードは含めない）。
 */
public record LoginUserResponse(String loginId) {
}
