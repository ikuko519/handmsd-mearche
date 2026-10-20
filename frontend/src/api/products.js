// 商品APIの呼び出し。/api は vite.config.js のプロキシで Spring Boot (8080) に転送される。

/** 商品一覧を取得する（GET /api/products） */
export async function fetchProducts({ signal } = {}) {
  const res = await fetch('/api/products', { signal })
  if (!res.ok) {
    throw new Error(`商品一覧の取得に失敗しました（HTTP ${res.status}）`)
  }
  return res.json()
}
