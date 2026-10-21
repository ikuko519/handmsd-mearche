package com.handmademarche.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.handmademarche.exception.ProductNotFoundException;
import com.handmademarche.exception.ProductPurchasedException;
import com.handmademarche.exception.PurchaseAccessDeniedException;
import com.handmademarche.exception.PurchaseNotFoundException;

/**
 * API共通のエラー処理。入力エラーを 400 Bad Request、ログイン失敗を 401 Unauthorized、
 * 他人の購入情報を 403 Forbidden、存在しない商品・購入情報を 404 Not Found、
 * 購入された商品の削除を 409 Conflict として分かりやすい形で返す。
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	/** 入力チェック（@Valid）でエラーになった場合 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public Map<String, Object> handleValidation(MethodArgumentNotValidException e) {
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError error : e.getBindingResult().getFieldErrors()) {
			errors.putIfAbsent(error.getField(), error.getDefaultMessage());
		}
		return Map.of("message", "入力内容に誤りがあります", "errors", errors);
	}

	/** JSONの形式が不正、または型が合わない場合（例: 価格に文字列） */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public Map<String, Object> handleNotReadable(HttpMessageNotReadableException e) {
		return Map.of("message", "リクエストの形式が正しくありません");
	}

	/** URLの商品IDが数値でない場合（例: /api/products/abc） */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public Map<String, Object> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
		return Map.of("message", "リクエストの形式が正しくありません");
	}

	/**
	 * ログインIDまたはパスワードが違う場合。
	 * どちらが違うかを教えると、存在するログインIDを推測されるため、同じメッセージにする。
	 */
	@ExceptionHandler(AuthenticationException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public Map<String, Object> handleAuthentication(AuthenticationException e) {
		return Map.of("message", "ログインIDまたはパスワードが正しくありません");
	}

	/** 指定したIDの商品が存在しない場合 */
	@ExceptionHandler(ProductNotFoundException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public Map<String, Object> handleProductNotFound(ProductNotFoundException e) {
		return Map.of("message", e.getMessage());
	}

	/** 購入された商品を削除しようとした場合 */
	@ExceptionHandler(ProductPurchasedException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public Map<String, Object> handleProductPurchased(ProductPurchasedException e) {
		return Map.of("message", e.getMessage());
	}

	/** 指定したIDの購入情報が存在しない場合 */
	@ExceptionHandler(PurchaseNotFoundException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public Map<String, Object> handlePurchaseNotFound(PurchaseNotFoundException e) {
		return Map.of("message", e.getMessage());
	}

	/** 他の利用者の購入情報を取得しようとした場合 */
	@ExceptionHandler(PurchaseAccessDeniedException.class)
	@ResponseStatus(HttpStatus.FORBIDDEN)
	public Map<String, Object> handlePurchaseAccessDenied(PurchaseAccessDeniedException e) {
		return Map.of("message", e.getMessage());
	}
}
