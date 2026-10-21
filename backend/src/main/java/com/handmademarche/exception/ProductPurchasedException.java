package com.handmademarche.exception;

/**
 * 購入された商品を削除しようとした場合の例外。ApiExceptionHandler で 409 Conflict に変換する。
 * 削除すると購入情報から商品をたどれなくなるため、削除できないようにしている。
 */
public class ProductPurchasedException extends RuntimeException {

	public ProductPurchasedException(Long id) {
		super("購入された商品のため削除できません（ID: " + id + "）");
	}
}
