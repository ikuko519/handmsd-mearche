import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers.js'
import { TEST_CSRF_TOKEN } from '../test/setup.js'
import { apiFetch, UNAUTHORIZED_EVENT } from './http.js'

function clearCsrfCookie() {
  document.cookie = 'XSRF-TOKEN=; path=/; max-age=0'
}

describe('apiFetch', () => {
  it('POST などデータを変更するリクエストには、CSRFトークンのヘッダーを付ける', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}))

    await apiFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' } })

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': TEST_CSRF_TOKEN,
    })
  })

  it('GET にはCSRFトークンを付けない', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, []))

    await apiFetch('/api/products')

    expect(fetchMock.mock.calls[0][1].headers).toEqual({})
  })

  it('CSRFトークンのCookieがない場合（ログアウト直後など）は、先に発行してもらってから送る', async () => {
    clearCsrfCookie()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/health') {
        document.cookie = 'XSRF-TOKEN=new-token; path=/'
      }
      return jsonResponse(200, {})
    })

    await apiFetch('/api/login', { method: 'POST' })

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/health', '/api/login'])
    expect(fetchMock.mock.calls[1][1].headers['X-XSRF-TOKEN']).toBe('new-token')
  })

  it('401 が返ったら、ログイン切れのイベントを発生させる', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, {}))
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await apiFetch('/api/products')
    await apiFetch('/api/login', { method: 'POST', ignoreUnauthorized: true })

    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
    // ignoreUnauthorized を指定したログインAPIの 401 では発生させない
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
