package com.handmademarche.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.handmademarche.dto.PurchaseCreateRequest;
import com.handmademarche.dto.PurchaseResponse;
import com.handmademarche.entity.Product;
import com.handmademarche.entity.Purchase;
import com.handmademarche.entity.User;
import com.handmademarche.exception.ProductNotFoundException;
import com.handmademarche.exception.PurchaseAccessDeniedException;
import com.handmademarche.exception.PurchaseNotFoundException;
import com.handmademarche.repository.ProductRepository;
import com.handmademarche.repository.PurchaseRepository;
import com.handmademarche.repository.UserRepository;

/**
 * 購入に関する業務処理。本格的な決済は行わず、購入情報を登録するだけの簡易的な購入とする。
 */
@Service
@Transactional(readOnly = true)
public class PurchaseService {

	private final PurchaseRepository purchaseRepository;
	private final ProductRepository productRepository;
	private final UserRepository userRepository;

	public PurchaseService(PurchaseRepository purchaseRepository, ProductRepository productRepository,
			UserRepository userRepository) {
		this.purchaseRepository = purchaseRepository;
		this.productRepository = productRepository;
		this.userRepository = userRepository;
	}

	/**
	 * ログイン中の利用者が、指定した商品を購入する。購入日時は登録した時点とする。
	 * 商品が存在しない場合は ProductNotFoundException
	 */
	@Transactional
	public PurchaseResponse purchase(String loginId, PurchaseCreateRequest request) {
		Product product = productRepository.findById(request.productId())
				.orElseThrow(() -> new ProductNotFoundException(request.productId()));
		Purchase purchase = new Purchase(findUser(loginId), product,
				LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
		return PurchaseResponse.from(purchaseRepository.save(purchase));
	}

	/**
	 * 指定したIDの購入情報を取得する。存在しない場合は PurchaseNotFoundException、
	 * ログイン中の利用者以外の購入情報の場合は PurchaseAccessDeniedException
	 */
	public PurchaseResponse findById(Long id, String loginId) {
		Purchase purchase = purchaseRepository.findById(id)
				.orElseThrow(() -> new PurchaseNotFoundException(id));
		if (!purchase.getUser().getLoginId().equals(loginId)) {
			throw new PurchaseAccessDeniedException();
		}
		return PurchaseResponse.from(purchase);
	}

	/** ログイン中の利用者を取得する（ログインできている以上、通常は必ず存在する） */
	private User findUser(String loginId) {
		return userRepository.findByLoginId(loginId)
				.orElseThrow(() -> new IllegalStateException("ログイン中の利用者が見つかりません: " + loginId));
	}
}
