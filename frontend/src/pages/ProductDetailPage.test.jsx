import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers.js'
import { mockBackend, renderApp } from '../test/mockBackend.jsx'

const muffler = {
  id: 3,
  name: '手編みのマフラー',
  price: 3500,
  description: 'ウール100%です。\n手洗いできます。',
  imageUrl: 'https://example.com/muffler.jpg',
}
const spoon = { id: 7, name: '木製スプーン', price: 1200, description: null, imageUrl: null }

/** 「商品名」「価格」「説明」の欄の値 */
function detail(label) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('商品詳細画面', () => {
  it('商品一覧の「詳細を見る」から、選んだ商品の詳細画面に移動する', async () => {
    const { fetchMock } = mockBackend([muffler, spoon])
    const user = renderApp('/products')

    await user.click(await screen.findByRole('link', { name: '木製スプーンの詳細を見る' }))

    expect(screen.getByRole('heading', { name: '商品詳細' })).toBeInTheDocument()
    expect(await screen.findByText('木製スプーン')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/products/7')).toBe(true)
  })

  it('商品画像・商品名・価格・説明を表示する', async () => {
    mockBackend([muffler, spoon])
    renderApp('/products/3')

    expect(await screen.findByRole('img', { name: '手編みのマフラー' })).toHaveAttribute(
      'src',
      'https://example.com/muffler.jpg',
    )
    expect(detail('商品名')).toHaveTextContent('手編みのマフラー')
    expect(detail('価格')).toHaveTextContent('3,500円')
    // 改行を含む説明もそのまま表示する
    expect(detail('説明').textContent).toBe('ウール100%です。\n手洗いできます。')
  })

  it('画像・説明がない商品は「商品画像」の枠と「説明はありません。」を表示する', async () => {
    mockBackend([muffler, spoon])
    renderApp('/products/7')

    await screen.findByText('木製スプーン')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('商品画像')).toBeInTheDocument()
    expect(detail('説明')).toHaveTextContent('説明はありません。')
  })

  it('「購入へ進む」を押すと、その商品の購入画面に移動する', async () => {
    mockBackend([muffler, spoon])
    const user = renderApp('/products/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('link', { name: '購入へ進む' }))

    expect(await screen.findByRole('heading', { name: '購入内容の確認' })).toBeInTheDocument()
    expect(await screen.findByText('手編みのマフラー')).toBeInTheDocument()
  })

  it('「一覧へ戻る」を押すと、商品一覧画面に戻る', async () => {
    mockBackend([muffler, spoon])
    const user = renderApp('/products/3')
    await screen.findByText('手編みのマフラー')

    await user.click(screen.getByRole('link', { name: '一覧へ戻る' }))

    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
  })

  it.each([
    ['存在しない商品ID', '/products/999'],
    ['数値でない商品ID', '/products/abc'],
  ])('%sの場合はエラーを表示し、購入へ進めない', async (_label, path) => {
    const { fetchMock } = mockBackend([muffler])
    // 実際のバックエンドは数値でないIDに 400 を返す
    const original = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, options) =>
      url === '/api/products/abc' ? Promise.resolve(jsonResponse(400, {})) : original(url, options),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp(path)

    expect(
      await screen.findByText('指定された商品が見つかりません。すでに削除された可能性があります。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '購入へ進む' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '商品一覧に戻る' })).toHaveAttribute('href', '/products')
  })

  it('取得に失敗した場合はエラーを表示する', async () => {
    const { fetchMock } = mockBackend([muffler])
    fetchMock.mockImplementation(async (url) =>
      url === '/api/me' ? jsonResponse(200, { loginId: 'user1' }) : jsonResponse(500, {}),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/products/3')

    expect(
      await screen.findByText('商品情報を取得できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
  })

  it('「商品を登録する」の画面（/products/new）は、商品詳細画面と取り違えない', async () => {
    mockBackend([muffler])
    renderApp('/products/new')

    expect(await screen.findByRole('heading', { name: '商品登録' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '商品詳細' })).not.toBeInTheDocument()
  })

  it('未ログインで商品詳細画面を開くとログイン画面に移動し、ログイン後に商品詳細画面に戻る', async () => {
    mockBackend([muffler], { loggedIn: false })
    const user = renderApp('/products/3')
    await screen.findByRole('heading', { name: 'ログイン' })

    await user.type(screen.getByLabelText('ログインID'), 'user1')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('heading', { name: '商品詳細' })).toBeInTheDocument()
    expect(await screen.findByText('手編みのマフラー')).toBeInTheDocument()
  })
})
