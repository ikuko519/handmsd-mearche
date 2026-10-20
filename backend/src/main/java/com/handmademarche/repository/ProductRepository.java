package com.handmademarche.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.handmademarche.entity.Product;

/**
 * 商品のデータベース操作。基本的なメソッドは JpaRepository が提供する。
 */
public interface ProductRepository extends JpaRepository<Product, Long> {
}
