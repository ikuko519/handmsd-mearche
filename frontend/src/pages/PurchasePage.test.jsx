import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers.js'
import { mockBackend, renderApp } from '../test/mockBackend.jsx'

const muffler = { id: 3, name: '手編みのマフラー', price: 3500, description: 'ウール100%です。', imageUrl: null }
const spoon = { id: 7, name: '木製スプーン', price: 1200, description: null, imageUrl: null }

/** POST /api/purchases の呼び出し */
function purchaseCalls(fetchMock) {
  return fetchMock.mock.calls.filter(([url, options]) => url === '/api/purchases' && options?.method === 'POST')
}

/** 購入内容の「商品名」「価格」などの欄の値 */
function detail(label) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling
}

/** fetch のうち、指定したURL・メソッドだけ別の応答にする */
function overrideFetch(fetchMock, url, method, response) {
  const original = fetchMock.getMockImplementation()
  fetchMock.mockImplementation((u, options = {}) =>
    u === url && (options.method ?? 'GET') === method ? response() : original(u, options),
  )
}

describe('購入画面', () => {
  it('商品一覧の「購入へ進む」から購入画面に移動し、商品名と価格を表示する', async () => {
    mockBackend([muffler, spoon])
    const user = renderApp('/products')

    await user.click(await screen.findByRole('link', { name: '木製スプーンの購入へ進む' }))

    expect(screen.getByRole('heading', { name: '購入内容の確認' })).toBeInTheDocument()
    expect(await screen.findByText('木製スプーン')).toBeInTheDocument()
    expect(detail('商品名')).toHaveTextContent('木製スプーン')
    expect(detail('価格')).toHaveTextContent('1,200円')
    expect(screen.getByRole('button', { name: '購入確定' })).toBeEnabled()
  })

  it('「購入確定」を押すと購入を登録し、購入完了画面に購入した商品と購入日時を表示する', async () => {
    const { fetchMock } = mockBackend([muffler, spoon])
    const user = renderApp('/purchase/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('button', { name: '購入確定' }))

    expect(await screen.findByRole('heading', { name: 'ご購入ありがとうございます' })).toBeInTheDocument()
    expect(screen.getByText('購入が完了しました')).toBeInTheDocument()
    expect(detail('商品名')).toHaveTextContent('手編みのマフラー')
    expect(detail('購入日時')).toHaveTextContent('2026/10/21 14:05')

    // 送るのは商品IDだけ（購入者はログイン情報からバックエンドが決める）
    const calls = purchaseCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(JSON.parse(calls[0][1].body)).toEqual({ productId: 3 })
    // 購入完了画面は購入結果をAPIから取得して表示する
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/purchases/1')).toBe(true)
  })

  it('購入完了画面から商品一覧に戻れる', async () => {
    mockBackend([muffler])
    const user = renderApp('/purchase/3')
    await user.click(await screen.findByRole('button', { name: '購入確定' }))
    await screen.findByRole('heading', { name: 'ご購入ありがとうございます' })

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: '商品一覧に戻る' }))

    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
  })

  it('「商品一覧へ戻る」を押すと、購入せずに商品一覧画面に戻る', async () => {
    const { fetchMock } = mockBackend([muffler])
    const user = renderApp('/purchase/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('link', { name: '商品一覧へ戻る' }))

    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
    expect(purchaseCalls(fetchMock)).toHaveLength(0)
  })

  it('購入処理中は「購入確定」を押せない（二重購入の防止）', async () => {
    const { fetchMock } = mockBackend([muffler])
    overrideFetch(fetchMock, '/api/purchases', 'POST', () => new Promise(() => {}))
    const user = renderApp('/purchase/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('button', { name: '購入確定' }))

    const button = screen.getByRole('button', { name: '購入処理中...' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(purchaseCalls(fetchMock)).toHaveLength(1)
  })

  it('存在しない商品の購入画面を開くとエラーを表示し、購入確定ボタンを表示しない', async () => {
    mockBackend([muffler])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/purchase/999')

    expect(
      await screen.findByText('指定された商品が見つかりません。すでに削除された可能性があります。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '購入確定' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '商品一覧に戻る' })).toHaveAttribute('href', '/products')
  })

  it('商品情報の取得に失敗した場合はエラーを表示する', async () => {
    const { fetchMock } = mockBackend([muffler])
    overrideFetch(fetchMock, '/api/products/3', 'GET', () => Promise.resolve(jsonResponse(500, {})))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/purchase/3')

    expect(
      await screen.findByText('商品情報を取得できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
  })

  it('購入画面を開いた後に商品が削除されていた場合（404）は、エラーを表示して購入画面に留まる', async () => {
    const { fetchMock } = mockBackend([muffler])
    overrideFetch(fetchMock, '/api/purchases', 'POST', () =>
      Promise.resolve(jsonResponse(404, { message: '商品が見つかりません（ID: 3）' })),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderApp('/purchase/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('button', { name: '購入確定' }))

    expect(await screen.findByText('この商品はすでに削除されているため、購入できません。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '購入内容の確認' })).toBeInTheDocument()
  })

  it('通信に失敗した場合はエラーを表示し、もう一度「購入確定」を押せる', async () => {
    const { fetchMock } = mockBackend([muffler])
    overrideFetch(fetchMock, '/api/purchases', 'POST', () => Promise.reject(new TypeError('Failed to fetch')))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderApp('/purchase/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('button', { name: '購入確定' }))

    expect(await screen.findByText('購入できませんでした。時間をおいて再度お試しください。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '購入確定' })).toBeEnabled()
  })

  it('未ログインで購入画面を開くとログイン画面に移動し、ログイン後に購入画面に戻る', async () => {
    mockBackend([muffler], { loggedIn: false })
    const user = renderApp('/purchase/3')
    await screen.findByRole('heading', { name: 'ログイン' })

    await user.type(screen.getByLabelText('ログインID'), 'user1')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('heading', { name: '購入内容の確認' })).toBeInTheDocument()
    expect(await screen.findByText('手編みのマフラー')).toBeInTheDocument()
  })

  it('購入確定の前にログインが切れていた場合は、ログイン画面に移動する', async () => {
    const backend = mockBackend([muffler])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderApp('/purchase/3')
    await screen.findByText('手編みのマフラー')

    backend.expireSession()
    await user.click(screen.getByRole('button', { name: '購入確定' }))

    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    expect(
      screen.getByText('ログインの有効期限が切れました。もう一度ログインしてください。'),
    ).toBeInTheDocument()
  })
})

describe('購入完了画面', () => {
  const purchase = {
    id: 5,
    productId: 3,
    productName: '手編みのマフラー',
    price: 3500,
    purchaseDate: '2026-01-09T08:03:00',
    buyer: 'user1',
  }

  it('URLの購入IDの購入結果を表示する', async () => {
    mockBackend([muffler], { purchases: [purchase] })
    renderApp('/purchase/complete/5')

    expect(await screen.findByRole('heading', { name: 'ご購入ありがとうございます' })).toBeInTheDocument()
    expect(detail('商品名')).toHaveTextContent('手編みのマフラー')
    expect(detail('購入日時')).toHaveTextContent('2026/01/09 08:03')
  })

  it.each([
    ['他の利用者の購入情報（403）', [{ ...purchase, buyer: 'user2' }], 'この購入情報は表示できません。'],
    ['存在しない購入情報（404）', [], '購入情報が見つかりません。'],
  ])('%sの場合はエラーを表示する', async (_label, purchases, message) => {
    mockBackend([muffler], { purchases })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/purchase/complete/5')

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'ご購入ありがとうございます' })).not.toBeInTheDocument()
    expect(screen.queryByText('手編みのマフラー')).not.toBeInTheDocument()
  })

  it('取得に失敗した場合はエラーを表示する', async () => {
    const { fetchMock } = mockBackend([muffler], { purchases: [purchase] })
    overrideFetch(fetchMock, '/api/purchases/5', 'GET', () => Promise.reject(new TypeError('Failed to fetch')))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/purchase/complete/5')

    expect(
      await screen.findByText('購入情報を取得できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
  })
})
