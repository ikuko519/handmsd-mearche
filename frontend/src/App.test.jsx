import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { jsonResponse } from './test/helpers.js'

/**
 * バックエンドの代わり。POST で受け取った商品を保存し、GET で一覧として返す。
 */
function mockBackend() {
  const products = []
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    if (url === '/api/products' && options.method === 'POST') {
      const product = { id: products.length + 1, ...JSON.parse(options.body) }
      products.push(product)
      return jsonResponse(201, product)
    }
    if (url === '/api/products') {
      return jsonResponse(200, products)
    }
    return jsonResponse(404, {})
  })
}

function renderApp(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('商品登録から一覧表示までの流れ', () => {
  it('一覧画面 →「商品を登録する」→ 登録 → 一覧画面に登録した商品が表示される', async () => {
    mockBackend()
    const user = renderApp('/products')

    expect(await screen.findByText('現在、出品されている商品はありません。')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '商品を登録する' }))

    expect(screen.getByRole('heading', { name: '商品登録' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/商品名/), '陶器のマグカップ')
    await user.type(screen.getByLabelText(/価格/), '2800')
    await user.type(screen.getByLabelText('商品説明'), '手びねりのマグカップです。')
    await user.type(screen.getByLabelText('画像URL'), 'https://example.com/mug.jpg')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(await screen.findByText('商品を登録しました。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
    expect(await screen.findByText('陶器のマグカップ')).toBeInTheDocument()
    expect(screen.getByText('2,800円')).toBeInTheDocument()
    expect(screen.getByText('手びねりのマグカップです。')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '陶器のマグカップ' })).toHaveAttribute(
      'src',
      'https://example.com/mug.jpg',
    )
  })

  it('トップページ（/）にアクセスすると商品一覧画面を表示する', async () => {
    mockBackend()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
  })
})
