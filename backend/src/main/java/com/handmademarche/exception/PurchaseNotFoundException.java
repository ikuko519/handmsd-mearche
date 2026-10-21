package com.handmademarche.exception;

/**
 * 指定したIDの購入情報が存在しない場合の例外。ApiExceptionHandler で 404 Not Found に変換する。
 */
public class PurchaseNotFoundException extends RuntimeException {

	public PurchaseNotFoundException(Long id) {
		super("購入情報が見つかりません（ID: " + id + "）");
	}
}
