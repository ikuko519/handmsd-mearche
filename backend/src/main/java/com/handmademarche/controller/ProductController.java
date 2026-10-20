package com.handmademarche.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.handmademarche.entity.Product;
import com.handmademarche.service.ProductService;

/**
 * 商品API。
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

	private final ProductService productService;

	public ProductController(ProductService productService) {
		this.productService = productService;
	}

	/** GET /api/products : 商品一覧を返す */
	@GetMapping
	public List<Product> list() {
		return productService.findAll();
	}
}
