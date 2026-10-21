// App 全体のテストで使う、バックエンドの代わり
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App.jsx'
import { jsonResponse } from './helpers.js'
import { TEST_CSRF_TOKEN } from './setup.js'

/** 購入APIが返す購入日時（購入完了画面では「2026/10/21 14:05」と表示される） */
export const PURCHASE_DATE = '2026-10-21T14:05:30'

/** 購入情報から、購入者（buyer）を除いたAPIの応答を作る */
const toPurchaseResponse = ({ id, productId, productName, price, purchaseDate }) => ({
  id,
  productId,
  productName,
  price,
  purchaseDate,
})

const unauthorized = () => jsonResponse(401, { message: 'ログインしてください' })

/**
 * fetch をバックエンドの代わりに差し替える。
 * - ログイン：user1 / password123 で成功。loggedIn: false で未ログインの状態から始められる
 * - 商品：POST で保存、PUT で置き換え、DELETE で削除、GET で一覧・1件を返す（未ログインなら 401）
 * - 購入：POST で登録（購入日時は PURCHASE_DATE）、GET で1件を返す。他の利用者（buyer が user1 以外）の購入は 403。
 *   購入された商品の DELETE は 409
 * - POST・PUT・DELETE は、CSRFトークンのヘッダーがなければ 403
 * 戻り値の expireSession() を呼ぶと、ログインの有効期限が切れた状態にできる。
 */
export function mockBackend(initialProducts = [], { loggedIn = true, purchases: initialPurchases = [] } = {}) {
  const products = [...initialProducts]
  const purchases = [...initialPurchases]
  let nextId = Math.max(0, ...products.map((p) => p.id)) + 1
  let nextPurchaseId = Math.max(0, ...purchases.map((p) => p.id)) + 1
  let currentUser = loggedIn ? { loginId: 'user1' } : null

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    const method = options.method ?? 'GET'
    if (method !== 'GET' && options.headers?.['X-XSRF-TOKEN'] !== TEST_CSRF_TOKEN) {
      return jsonResponse(403, { message: 'この操作は許可されていません' })
    }

    if (url === '/api/me') {
      return currentUser ? jsonResponse(200, currentUser) : unauthorized()
    }
    if (url === '/api/login') {
      const { loginId, password } = JSON.parse(options.body)
      if (loginId === 'user1' && password === 'password123') {
        currentUser = { loginId }
        return jsonResponse(200, currentUser)
      }
      return jsonResponse(401, { message: 'ログインIDまたはパスワードが正しくありません' })
    }
    if (url === '/api/logout') {
      currentUser = null
      return new Response(null, { status: 204 })
    }
    if (!currentUser) {
      return unauthorized()
    }

    if (url === '/api/purchases' && method === 'POST') {
      const { productId } = JSON.parse(options.body)
      const product = products.find((p) => p.id === productId)
      if (!product) {
        return jsonResponse(404, { message: `商品が見つかりません（ID: ${productId}）` })
      }
      const purchase = {
        id: nextPurchaseId++,
        productId,
        productName: product.name,
        price: product.price,
        purchaseDate: PURCHASE_DATE,
        buyer: currentUser.loginId,
      }
      purchases.push(purchase)
      return jsonResponse(201, toPurchaseResponse(purchase))
    }
    const purchaseMatch = url.match(/^\/api\/purchases\/(\d+)$/)
    if (purchaseMatch) {
      const purchase = purchases.find((p) => p.id === Number(purchaseMatch[1]))
      if (!purchase) {
        return jsonResponse(404, { message: '購入情報が見つかりません' })
      }
      if (purchase.buyer !== currentUser.loginId) {
        return jsonResponse(403, { message: 'この購入情報を表示する権限がありません' })
      }
      return jsonResponse(200, toPurchaseResponse(purchase))
    }

    if (url === '/api/products' && method === 'POST') {
      const product = { id: nextId++, ...JSON.parse(options.body) }
      products.push(product)
      return jsonResponse(201, product)
    }
    if (url === '/api/products') {
      return jsonResponse(200, products)
    }
    const match = url.match(/^\/api\/products\/(\d+)$/)
    const index = match ? products.findIndex((p) => p.id === Number(match[1])) : -1
    if (index === -1) {
      return jsonResponse(404, {})
    }
    if (method === 'DELETE') {
      if (purchases.some((p) => p.productId === products[index].id)) {
        return jsonResponse(409, { message: '購入された商品のため削除できません' })
      }
      products.splice(index, 1)
      return new Response(null, { status: 204 })
    }
    if (method === 'PUT') {
      products[index] = { id: products[index].id, ...JSON.parse(options.body) }
    }
    return jsonResponse(200, products[index])
  })

  return {
    fetchMock,
    expireSession: () => {
      currentUser = null
    },
  }
}

/** 指定したURLで App 全体を表示する */
export function renderApp(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}
