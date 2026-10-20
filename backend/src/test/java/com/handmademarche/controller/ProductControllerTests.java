package com.handmademarche.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import jakarta.persistence.EntityManager;

/**
 * 商品一覧・商品登録・商品更新APIのテスト。本番用のDBファイルを汚さないよう、メモリ上のH2を使う。
 */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:testdb")
@AutoConfigureMockMvc
@Transactional
class ProductControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private EntityManager entityManager;

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

	// ---- 商品更新 PUT /api/products/{id} ----

	@Test
	void 商品を更新できる() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, "ウール100%の手編みマフラーです。"));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー（紺）", "price": 3800, "description": "紺色の毛糸で編みました。"}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(product.getId()))
				.andExpect(jsonPath("$.name").value("手編みのマフラー（紺）"))
				.andExpect(jsonPath("$.price").value(3800))
				.andExpect(jsonPath("$.description").value("紺色の毛糸で編みました。"));

		// メモリ上のキャッシュではなく、DBに保存された値を確認する
		entityManager.flush();
		entityManager.clear();
		Product updated = productRepository.findById(product.getId()).orElseThrow();
		assertThat(updated.getName()).isEqualTo("手編みのマフラー（紺）");
		assertThat(updated.getPrice()).isEqualTo(3800);
		assertThat(updated.getDescription()).isEqualTo("紺色の毛糸で編みました。");
	}

	@Test
	void 更新した商品が一覧に反映され他の商品は変わらない() throws Exception {
		Product target = productRepository.save(new Product("木製スプーン", 1200, "山桜のスプーンです。"));
		productRepository.save(new Product("陶器のマグカップ", 2800, "手びねりのマグカップです。"));

		mockMvc.perform(put("/api/products/{id}", target.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "木製スプーン（大）", "price": 1500, "description": "大きめサイズです。"}
						"""))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/products"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].name").value("木製スプーン（大）"))
				.andExpect(jsonPath("$[0].price").value(1500))
				.andExpect(jsonPath("$[1].name").value("陶器のマグカップ"))
				.andExpect(jsonPath("$[1].price").value(2800));
	}

	@Test
	void 商品説明を省略すると空になる() throws Exception {
		Product product = productRepository.save(new Product("刺繍のハンカチ", 900, "花柄の刺繍です。"));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "刺繍のハンカチ", "price": 0}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.price").value(0))
				.andExpect(jsonPath("$.description").doesNotExist());
	}

	@Test
	void 本文にidを指定してもURLの商品だけが更新される() throws Exception {
		Product target = productRepository.save(new Product("更新対象", 1000, null));
		Product other = productRepository.save(new Product("別の商品", 2000, null));

		mockMvc.perform(put("/api/products/{id}", target.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"id": %d, "name": "更新後", "price": 1100}
						""".formatted(other.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(target.getId()));

		entityManager.flush();
		entityManager.clear();
		assertThat(productRepository.findById(target.getId()).orElseThrow().getName()).isEqualTo("更新後");
		assertThat(productRepository.findById(other.getId()).orElseThrow().getName()).isEqualTo("別の商品");
	}

	@Test
	void 存在しない商品IDの場合は404エラー() throws Exception {
		mockMvc.perform(put("/api/products/{id}", 9999).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": 3500}
						"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("商品が見つかりません（ID: 9999）"));

		assertThat(productRepository.count()).isZero();
	}

	@Test
	void 商品IDが数値でない場合は400エラー() throws Exception {
		mockMvc.perform(put("/api/products/abc").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": 3500}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストの形式が正しくありません"));
	}

	@Test
	void 更新時に商品名が空の場合は400エラーで変更されない() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, null));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "", "price": 3500}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.name").value("商品名を入力してください"));

		entityManager.flush();
		entityManager.clear();
		assertThat(productRepository.findById(product.getId()).orElseThrow().getName()).isEqualTo("手編みのマフラー");
	}

	@Test
	void 更新時に商品名が101文字以上の場合は400エラー() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, null));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "%s", "price": 3500}
						""".formatted("あ".repeat(101))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.name").value("商品名は100文字以内で入力してください"));
	}

	@Test
	void 更新時に価格が未入力の場合は400エラー() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, null));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.price").value("価格を入力してください"));
	}

	@Test
	void 更新時に価格がマイナスの場合は400エラーで変更されない() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, null));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": -1}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.price").value("価格は0円以上で入力してください"));

		entityManager.flush();
		entityManager.clear();
		assertThat(productRepository.findById(product.getId()).orElseThrow().getPrice()).isEqualTo(3500);
	}

	@Test
	void 更新時に商品説明が1001文字以上の場合は400エラー() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, null));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": 3500, "description": "%s"}
						""".formatted("あ".repeat(1001))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.description").value("商品説明は1000文字以内で入力してください"));
	}

	@Test
	void 更新時に価格が数値でない場合は400エラー() throws Exception {
		Product product = productRepository.save(new Product("手編みのマフラー", 3500, null));

		mockMvc.perform(put("/api/products/{id}", product.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "手編みのマフラー", "price": "abc"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("リクエストの形式が正しくありません"));
	}
}
