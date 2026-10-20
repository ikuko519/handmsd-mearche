package com.handmademarche.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.handmademarche.dto.ProductCreateRequest;
import com.handmademarche.dto.ProductUpdateRequest;
import com.handmademarche.entity.Product;
import com.handmademarche.exception.ProductNotFoundException;
import com.handmademarche.repository.ProductRepository;

/**
 * 商品に関する業務処理。
 */
@Service
@Transactional(readOnly = true)
public class ProductService {

	private final ProductRepository productRepository;

	public ProductService(ProductRepository productRepository) {
		this.productRepository = productRepository;
	}

	/** 商品一覧をID順で取得する */
	public List<Product> findAll() {
		return productRepository.findAll(Sort.by("id"));
	}

	/** 指定したIDの商品を取得する。存在しない場合は ProductNotFoundException */
	public Product findById(Long id) {
		return productRepository.findById(id)
				.orElseThrow(() -> new ProductNotFoundException(id));
	}

	/** 商品を新規登録する */
	@Transactional
	public Product create(ProductCreateRequest request) {
		Product product = new Product(request.name(), request.price(), request.description(),
				normalizeImageUrl(request.imageUrl()));
		return productRepository.save(product);
	}

	/** 指定したIDの商品の商品名・価格・商品説明・画像URLを更新する。存在しない場合は ProductNotFoundException */
	@Transactional
	public Product update(Long id, ProductUpdateRequest request) {
		Product product = productRepository.findById(id)
				.orElseThrow(() -> new ProductNotFoundException(id));
		product.setName(request.name());
		product.setPrice(request.price());
		product.setDescription(request.description());
		product.setImageUrl(normalizeImageUrl(request.imageUrl()));
		// 取得したEntityを変更すると、トランザクション終了時に自動でUPDATEされる
		return product;
	}

	/** 指定したIDの商品を削除する。存在しない場合は ProductNotFoundException */
	@Transactional
	public void delete(Long id) {
		Product product = productRepository.findById(id)
				.orElseThrow(() -> new ProductNotFoundException(id));
		productRepository.delete(product);
	}

	/** 画像URLが空文字の場合は「画像なし」として null にする */
	private String normalizeImageUrl(String imageUrl) {
		return (imageUrl == null || imageUrl.isBlank()) ? null : imageUrl;
	}
}
