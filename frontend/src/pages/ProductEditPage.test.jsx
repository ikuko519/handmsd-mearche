import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers.js'
import ProductEditPage from './ProductEditPage.jsx'

const product = {
  id: 5,
  name: '陶器のマグカップ',
  price: 2800,
  description: '手びねりで作りました。',
  imageUrl: 'https://example.com/mug.jpg',
}

/**
 * fetch の代わり。GET には getResponse を、PUT には putResponse を返す。
 * 値に関数を渡した場合は、その戻り値（Promise など）を返す。
 */
function mockFetch({ getResponse = jsonResponse(200, product), putResponse } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    const response = options.method === 'PUT' ? putResponse : getResponse
    return typeof response === 'function' ? response() : response
  })
}

/** 商品編集画面を表示する。更新後の移動先が分かるよう、一覧画面の代わりの目印を置く */
function renderPage(path = '/products/5/edit') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products/:id/edit" element={<ProductEditPage />} />
        <Route path="/products" element={<p>一覧画面</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

/** 入力欄の値を置き換える */
async function replace(user, label, value) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  if (value !== '') {
    await user.click(input)
    await user.paste(value)
  }
}

describe('商品編集画面', () => {
  it('読み込み中は、そのことを表示する', () => {
    mockFetch({ getResponse: () => new Promise(() => {}) })
    renderPage()

    expect(screen.getByText('商品情報を読み込み中です...')).toBeInTheDocument()
  })

  it('URLのIDの商品を取得し、現在の商品情報を入力欄に表示する', async () => {
    const fetchMock = mockFetch()
    renderPage()

    expect(await screen.findByLabelText(/商品名/)).toHaveValue('陶器のマグカップ')
    expect(screen.getByLabelText(/価格/)).toHaveValue('2800')
    expect(screen.getByLabelText('商品説明')).toHaveValue('手びねりで作りました。')
    expect(screen.getByLabelText('画像URL')).toHaveValue('https://example.com/mug.jpg')
    expect(screen.getByRole('button', { name: '更新する' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/products/5')
  })

  it('商品説明・画像URLが未設定の商品は、その欄を空で表示する', async () => {
    mockFetch({ getResponse: jsonResponse(200, { id: 5, name: '刺繍のハンカチ', price: 900, description: null, imageUrl: null }) })
    renderPage()

    expect(await screen.findByLabelText(/商品名/)).toHaveValue('刺繍のハンカチ')
    expect(screen.getByLabelText('商品説明')).toHaveValue('')
    expect(screen.getByLabelText('画像URL')).toHaveValue('')
  })

  it('編集した内容をPUTで送信し、商品一覧画面に戻る', async () => {
    const fetchMock = mockFetch({ putResponse: jsonResponse(200, { ...product, name: '陶器のマグカップ（白）' }) })
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await replace(user, /商品名/, '陶器のマグカップ（白）')
    await replace(user, /価格/, '3000')
    await replace(user, '商品説明', '白い釉薬で仕上げました。')
    await replace(user, '画像URL', 'https://example.com/mug-white.jpg')
    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(await screen.findByText('一覧画面')).toBeInTheDocument()
    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'PUT')
    expect(url).toBe('/api/products/5')
    expect(JSON.parse(options.body)).toEqual({
      name: '陶器のマグカップ（白）',
      price: 3000,
      description: '白い釉薬で仕上げました。',
      imageUrl: 'https://example.com/mug-white.jpg',
    })
  })

  it('商品説明・画像URLを空にすると null で送信する', async () => {
    const fetchMock = mockFetch({ putResponse: jsonResponse(200, product) })
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await replace(user, '商品説明', '')
    await replace(user, '画像URL', '')
    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(await screen.findByText('一覧画面')).toBeInTheDocument()
    const [, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'PUT')
    expect(JSON.parse(options.body)).toEqual({
      name: '陶器のマグカップ',
      price: 2800,
      description: null,
      imageUrl: null,
    })
  })

  it('入力内容に誤りがある場合はエラーを表示し、送信しない', async () => {
    const fetchMock = mockFetch()
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await replace(user, /商品名/, '')
    await replace(user, /価格/, '-1')
    await replace(user, '画像URL', 'ftp://example.com/a.jpg')
    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(screen.getByText('商品名を入力してください')).toBeInTheDocument()
    expect(screen.getByText('価格は0円以上の整数で入力してください')).toBeInTheDocument()
    expect(
      screen.getByText('画像URLは http:// または https:// で始まるURLを入力してください'),
    ).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'PUT')).toBe(false)
  })

  it('存在しない商品IDの場合は「見つかりません」と表示し、フォームを出さない', async () => {
    mockFetch({ getResponse: jsonResponse(404, { message: '商品が見つかりません（ID: 999）' }) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage('/products/999/edit')

    expect(
      await screen.findByText('指定された商品が見つかりません。すでに削除された可能性があります。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '更新する' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '商品一覧に戻る' })).toHaveAttribute('href', '/products')
  })

  it('商品情報の取得に失敗した場合はエラーメッセージを表示する', async () => {
    mockFetch({ getResponse: () => Promise.reject(new TypeError('Failed to fetch')) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()

    expect(
      await screen.findByText('商品情報を取得できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
  })

  it('更新時に商品が削除されていた場合（404）は、その旨を表示する', async () => {
    mockFetch({ putResponse: jsonResponse(404, { message: '商品が見つかりません（ID: 5）' }) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(
      await screen.findByText('この商品はすでに削除されているため、更新できません。'),
    ).toBeInTheDocument()
    expect(screen.queryByText('一覧画面')).not.toBeInTheDocument()
  })

  it('バックエンドの入力チェックで弾かれた場合は、項目ごとのエラーを表示する', async () => {
    mockFetch({
      putResponse: jsonResponse(400, {
        message: '入力内容に誤りがあります',
        errors: { imageUrl: '画像URLは500文字以内で入力してください' },
      }),
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(await screen.findByText('入力内容に誤りがあります。')).toBeInTheDocument()
    expect(screen.getByText('画像URLは500文字以内で入力してください')).toBeInTheDocument()
  })

  it('通信に失敗した場合はエラーメッセージを表示し、入力内容を残したまま再度送信できる', async () => {
    mockFetch({ putResponse: () => Promise.reject(new TypeError('Failed to fetch')) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await replace(user, /価格/, '3000')
    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(
      await screen.findByText('商品を更新できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '更新する' })).toBeEnabled()
    expect(screen.getByLabelText(/価格/)).toHaveValue('3000')
  })

  it('送信中はボタンを押せない（二重送信の防止）', async () => {
    mockFetch({ putResponse: () => new Promise(() => {}) })
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(screen.getByRole('button', { name: '更新中...' })).toBeDisabled()
  })

  it('キャンセルで商品一覧画面に戻る（更新しない）', async () => {
    const fetchMock = mockFetch()
    const user = renderPage()
    await screen.findByLabelText(/商品名/)

    await replace(user, /商品名/, '変更途中')
    await user.click(screen.getByRole('link', { name: 'キャンセル' }))

    expect(screen.getByText('一覧画面')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'PUT')).toBe(false)
  })
})
