package com.handmademarche.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.handmademarche.entity.Product;
import com.handmademarche.repository.ProductRepository;

/**
 * 商品一覧・商品登録APIのテスト。本番用のDBファイルを汚さないよう、メモリ上のH2を使う。
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

	// ---- 商品登録 POST /api/products ----

	@Test
	void 商品を登録できる() throws Exception {
		String body = """
				{"name": "陶器のマグカップ", "price": 2800, "description": "手びねりで作ったマグカップです。"}
				""";

		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", startsWith("/api/products/")))
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.name").value("陶器のマグカップ"))
				.andExpect(jsonPath("$.price").value(2800))
				.andExpect(jsonPath("$.description").value("手びねりで作ったマグカップです。"));

		List<Product> products = productRepository.findAll();
		assertThat(products).hasSize(1);
		assertThat(products.get(0).getName()).isEqualTo("陶器のマグカップ");
	}

	@Test
	void 登録した商品が一覧に表示される() throws Exception {
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "刺繍のハンカチ", "price": 900}
						"""))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/products"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].name").value("刺繍のハンカチ"));
	}

	@Test
	void 商品説明なし価格0円でも登録できる() throws Exception {
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "無料サンプル", "price": 0}
						"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.price").value(0))
				.andExpect(jsonPath("$.description").doesNotExist());
	}

	@Test
	void idを指定しても既存商品は上書きされず新規採番される() throws Exception {
		Product existing = productRepository.save(new Product("既存商品", 1000, null));

		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"id": %d, "name": "新しい商品", "price": 500}
						""".formatted(existing.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(not(existing.getId().intValue())));

		assertThat(productRepository.count()).isEqualTo(2);
		assertThat(productRepository.findById(existing.getId()).orElseThrow().getName()).isEqualTo("既存商品");
	}

	@Test
	void 商品名が空の場合は400エラー() throws Exception {
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "  ", "price": 1000}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.name").value("商品名を入力してください"));

		assertThat(productRepository.count()).isZero();
	}

	@Test
	void 商品名が101文字以上の場合は400エラー() throws Exception {
		String longName = "あ".repeat(101);
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "%s", "price": 1000}
						""".formatted(longName)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.name").value("商品名は100文字以内で入力してください"));
	}

	@Test
	void 価格が未入力の場合は400エラー() throws Exception {
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.price").value("価格を入力してください"));
	}

	@Test
	void 価格がマイナスの場合は400エラー() throws Exception {
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": -1}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.price").value("価格は0円以上で入力してください"));
	}

	@Test
	void 商品説明が1001文字以上の場合は400エラー() throws Exception {
		String longDescription = "あ".repeat(1001);
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": 3500, "description": "%s"}
						""".formatted(longDescription)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.description").value("商品説明は1000文字以内で入力してください"));
	}

	@Test
	void 価格が数値でない場合は400エラー() throws Exception {
		mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": "abc"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストの形式が正しくありません"));

		assertThat(productRepository.count()).isZero();
	}
}
