// 商品APIの呼び出し。ログインしていない場合、どのAPIも 401 を返す。
import { apiFetch, throwApiError } from './http.js'

export { ApiError } from './http.js'

/** 商品一覧を取得する（GET /api/products） */
export async function fetchProducts({ signal } = {}) {
  const res = await apiFetch('/api/products', { signal })
  if (!res.ok) await throwApiError(res, '商品一覧の取得に失敗しました')
  return res.json()
}

/** 指定したIDの商品を取得する（GET /api/products/{id}）。存在しない場合は status 404 の ApiError */
export async function fetchProduct(id, { signal } = {}) {
  const res = await apiFetch(`/api/products/${encodeURIComponent(id)}`, { signal })
  if (!res.ok) await throwApiError(res, '商品の取得に失敗しました')
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

/** 商品を削除する（DELETE /api/products/{id}）。成功時は 204 No Content で本文なし */
export async function deleteProduct(id) {
  const res = await apiFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) await throwApiError(res, '商品の削除に失敗しました')
}

/** 商品データを JSON で送信する（登録・更新で共通） */
async function sendProduct(url, method, product, failureMessage) {
  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })
  // バックエンドの ApiExceptionHandler は {"message": ..., "errors": {項目: メッセージ}} を返す
  if (!res.ok) await throwApiError(res, failureMessage)
  return res.json()
}
