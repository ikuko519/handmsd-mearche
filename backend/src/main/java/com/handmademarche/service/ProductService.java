package com.handmademarche.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.handmademarche.entity.Product;
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
}
