package com.handmademarche.exception;

/**
 * 他の利用者の購入情報を取得しようとした場合の例外。ApiExceptionHandler で 403 Forbidden に変換する。
 */
public class PurchaseAccessDeniedException extends RuntimeException {

	public PurchaseAccessDeniedException() {
		super("この購入情報を表示する権限がありません");
	}
}
