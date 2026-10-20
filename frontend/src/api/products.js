// 商品APIの呼び出し。/api は vite.config.js のプロキシで Spring Boot (8080) に転送される。

/** APIがエラーを返したときの例外。入力エラー（400）の場合は項目ごとのメッセージを持つ */
export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** 商品一覧を取得する（GET /api/products） */
export async function fetchProducts({ signal } = {}) {
  const res = await fetch('/api/products', { signal })
  if (!res.ok) {
    throw new ApiError(`商品一覧の取得に失敗しました（HTTP ${res.status}）`, res.status)
  }
  return res.json()
}

/** 商品を登録する（POST /api/products）。登録した商品を返す */
export async function createProduct(product) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })
  if (!res.ok) {
    // バックエンドの ApiExceptionHandler は {"message": ..., "errors": {項目: メッセージ}} を返す
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      body.message ?? `商品の登録に失敗しました（HTTP ${res.status}）`,
      res.status,
      body.errors ?? {},
    )
  }
  return res.json()
}
