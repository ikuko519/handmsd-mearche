// API呼び出しの共通処理。/api は vite.config.js のプロキシで Spring Boot (8080) に転送される。

/** APIがエラーを返したときの例外。入力エラー（400）の場合は項目ごとのメッセージを持つ */
export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** ログインが切れていた（API が 401 を返した）ときに発生させるイベントの名前 */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

// データを変更するリクエスト。CSRF対策のトークンを付けて送る必要がある
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function readCookie(name) {
  const row = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`))
  return row ? decodeURIComponent(row.slice(name.length + 1)) : null
}

/**
 * CSRFトークンを返す。Spring Security が XSRF-TOKEN という Cookie で渡してくる。
 * ログアウト直後などで Cookie がない場合は、ログイン不要のAPIを呼んで発行してもらう。
 */
async function getCsrfToken() {
  let token = readCookie('XSRF-TOKEN')
  if (!token) {
    await fetch('/api/health')
    token = readCookie('XSRF-TOKEN')
  }
  return token
}

/**
 * fetch に、CSRFトークンの付与と、ログイン切れ（401）の通知を加えたもの。
 * ignoreUnauthorized: true の場合は 401 でも通知しない（ログインAPIなど、401 が通常の結果のとき）
 */
export async function apiFetch(url, { ignoreUnauthorized = false, headers = {}, ...options } = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const requestHeaders = { ...headers }
  if (UNSAFE_METHODS.includes(method)) {
    const token = await getCsrfToken()
    if (token) requestHeaders['X-XSRF-TOKEN'] = token
  }

  const res = await fetch(url, { ...options, headers: requestHeaders })
  if (res.status === 401 && !ignoreUnauthorized) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return res
}

/** エラー応答（{"message": ..., "errors": {...}}）を ApiError にして投げる */
export async function throwApiError(res, failureMessage) {
  const body = await res.json().catch(() => ({}))
  throw new ApiError(body.message ?? `${failureMessage}（HTTP ${res.status}）`, res.status, body.errors ?? {})
}
