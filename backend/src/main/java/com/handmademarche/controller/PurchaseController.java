package com.handmademarche.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.handmademarche.dto.PurchaseCreateRequest;
import com.handmademarche.dto.PurchaseResponse;
import com.handmademarche.service.PurchaseService;

import jakarta.validation.Valid;

/**
 * 購入API。購入者は、リクエストの内容ではなくログイン情報から決める。
 */
@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

	private final PurchaseService purchaseService;

	public PurchaseController(PurchaseService purchaseService) {
		this.purchaseService = purchaseService;
	}

	/** POST /api/purchases : 購入情報を登録し、201 Created と購入結果を返す（購入画面の「購入確定」で使う） */
	@PostMapping
	public ResponseEntity<PurchaseResponse> purchase(@AuthenticationPrincipal UserDetails user,
			@Valid @RequestBody PurchaseCreateRequest request) {
		PurchaseResponse created = purchaseService.purchase(user.getUsername(), request);
		return ResponseEntity.created(URI.create("/api/purchases/" + created.id())).body(created);
	}

	/** GET /api/purchases/{id} : 自分の購入結果を返す（購入完了画面で使う） */
	@GetMapping("/{id}")
	public PurchaseResponse get(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
		return purchaseService.findById(id, user.getUsername());
	}
}
