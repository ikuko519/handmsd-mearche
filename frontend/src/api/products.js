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

/** 指定したIDの商品を取得する（GET /api/products/{id}）。存在しない場合は status 404 の ApiError */
export async function fetchProduct(id, { signal } = {}) {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { signal })
  if (!res.ok) {
    throw new ApiError(`商品の取得に失敗しました（HTTP ${res.status}）`, res.status)
  }
  return res.json()
}

/** 商品を登録する（POST /api/products）。登録した商品を返す */
export async function createProduct(product) {
  return sendProduct('/api/products', 'POST', product, '商品の登録に失敗しました')
}

/** 商品を更新する（PUT /api/products/{id}）。更新後の商品を返す */
export async function updateProduct(id, product) {
  return sendProduct(`/api/products/${encodeURIComponent(id)}`, 'PUT', product, '商品の更新に失敗しました')
}

/** 商品データを JSON で送信する（登録・更新で共通） */
async function sendProduct(url, method, product, failureMessage) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })
  if (!res.ok) {
    // バックエンドの ApiExceptionHandler は {"message": ..., "errors": {項目: メッセージ}} を返す
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.message ?? `${failureMessage}（HTTP ${res.status}）`, res.status, body.errors ?? {})
  }
  return res.json()
}
