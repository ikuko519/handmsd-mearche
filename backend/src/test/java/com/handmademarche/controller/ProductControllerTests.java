package com.handmademarche.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.handmademarche.entity.Product;
import com.handmademarche.repository.ProductRepository;

/**
 * 商品一覧APIのテスト。本番用のDBファイルを汚さないよう、メモリ上のH2を使う。
 */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:testdb")
@AutoConfigureMockMvc
@Transactional
class ProductControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProductRepository productRepository;

	@Test
	void 商品一覧を取得できる() throws Exception {
		productRepository.save(new Product("手編みのマフラー", 3500, "ウール100%の手編みマフラーです。"));
		productRepository.save(new Product("木製スプーン", 1200, "山桜の木から削り出したスプーンです。"));

		mockMvc.perform(get("/api/products"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].id").isNumber())
				.andExpect(jsonPath("$[0].name").value("手編みのマフラー"))
				.andExpect(jsonPath("$[0].price").value(3500))
				.andExpect(jsonPath("$[0].description").value("ウール100%の手編みマフラーです。"))
				.andExpect(jsonPath("$[1].name").value("木製スプーン"));
	}

	@Test
	void 商品がない場合は空の配列を返す() throws Exception {
		mockMvc.perform(get("/api/products"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
	}
}
