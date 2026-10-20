package com.handmademarche.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * API共通のエラー処理。入力エラーを 400 Bad Request として分かりやすい形で返す。
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
}
