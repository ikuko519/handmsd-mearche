// ログイン関連APIの呼び出し
import { apiFetch, throwApiError } from './http.js'

/** ログイン中の利用者を取得する（GET /api/me）。ログインしていなければ null */
export async function fetchMe({ signal } = {}) {
  const res = await apiFetch('/api/me', { signal, ignoreUnauthorized: true })
  if (res.status === 401) return null
  if (!res.ok) await throwApiError(res, 'ログイン状態の確認に失敗しました')
  return res.json()
}

/**
 * ログインする（POST /api/login）。成功したらログインした利用者を返す。
 * ログインIDまたはパスワードが違う場合は status 401 の ApiError を投げる。
 */
export async function login(loginId, password) {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
    ignoreUnauthorized: true,
  })
  if (!res.ok) await throwApiError(res, 'ログインに失敗しました')
  return res.json()
}

/** ログアウトする（POST /api/logout）。成功時は 204 No Content */
export async function logout() {
  const res = await apiFetch('/api/logout', { method: 'POST', ignoreUnauthorized: true })
  if (!res.ok) await throwApiError(res, 'ログアウトに失敗しました')
}
