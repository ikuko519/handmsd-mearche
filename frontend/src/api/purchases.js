// 購入APIの呼び出し。購入者はログイン情報からバックエンドが決めるため、送らない。
import { apiFetch, throwApiError } from './http.js'

/** 商品を購入する（POST /api/purchases）。登録した購入情報を返す。商品がない場合は status 404 の ApiError */
export async function createPurchase(productId) {
  const res = await apiFetch('/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  })
  if (!res.ok) await throwApiError(res, '購入に失敗しました')
  return res.json()
}

/**
 * 購入情報を取得する（GET /api/purchases/{id}）。
 * 存在しない場合は status 404、他の利用者の購入情報の場合は status 403 の ApiError
 */
export async function fetchPurchase(id, { signal } = {}) {
  const res = await apiFetch(`/api/purchases/${encodeURIComponent(id)}`, { signal })
  if (!res.ok) await throwApiError(res, '購入情報の取得に失敗しました')
  return res.json()
}
