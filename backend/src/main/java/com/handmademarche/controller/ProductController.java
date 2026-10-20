package com.handmademarche.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.handmademarche.dto.ProductCreateRequest;
import com.handmademarche.dto.ProductUpdateRequest;
import com.handmademarche.entity.Product;
import com.handmademarche.service.ProductService;

import jakarta.validation.Valid;

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

	/** POST /api/products : 商品を登録し、201 Created と登録した商品を返す */
	@PostMapping
	public ResponseEntity<Product> create(@Valid @RequestBody ProductCreateRequest request) {
		Product created = productService.create(request);
		return ResponseEntity.created(URI.create("/api/products/" + created.getId())).body(created);
	}

	/** PUT /api/products/{id} : 商品を更新し、更新後の商品を返す */
	@PutMapping("/{id}")
	public Product update(@PathVariable Long id, @Valid @RequestBody ProductUpdateRequest request) {
		return productService.update(id, request);
	}
}
