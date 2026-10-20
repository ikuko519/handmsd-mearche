package com.handmademarche.exception;

/**
 * 指定したIDの商品が存在しない場合の例外。ApiExceptionHandler で 404 Not Found に変換する。
 */
public class ProductNotFoundException extends RuntimeException {

	public ProductNotFoundException(Long id) {
		super("商品が見つかりません（ID: " + id + "）");
	}
}
