import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers.js'
import ProductCreatePage from './ProductCreatePage.jsx'

/** 商品登録画面を表示する。登録後の移動先が分かるよう、一覧画面の代わりの目印を置く */
function renderPage() {
  render(
    <MemoryRouter initialEntries={['/products/new']}>
      <Routes>
        <Route path="/products/new" element={<ProductCreatePage />} />
        <Route path="/products" element={<p>一覧画面</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

/** 入力欄に値を入れる（長い文字列も速く入るよう貼り付けで入力） */
async function fill(user, label, value) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  await user.click(input)
  await user.paste(value)
}

describe('商品登録画面', () => {
  it('入力項目と登録ボタンが表示される', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: '商品登録' })).toBeInTheDocument()
    expect(screen.getByLabelText(/商品名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/価格/)).toBeInTheDocument()
    expect(screen.getByLabelText('商品説明')).toBeInTheDocument()
    expect(screen.getByLabelText('画像URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument()
  })

  it('入力した内容をAPIに送信し、商品一覧画面に戻る', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(201, { id: 1, name: '手編みのマフラー', price: 3500 }))
    const user = renderPage()

    await fill(user, /商品名/, '  手編みのマフラー  ')
    await fill(user, /価格/, '3500')
    await fill(user, '商品説明', 'ウール100%です。')
    await fill(user, '画像URL', 'https://example.com/muffler.jpg')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(await screen.findByText('一覧画面')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/products')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      name: '手編みのマフラー',
      price: 3500,
      description: 'ウール100%です。',
      imageUrl: 'https://example.com/muffler.jpg',
    })
  })

  it('任意項目（商品説明・画像URL）が空の場合は null で送信する', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(201, { id: 1, name: '無料サンプル', price: 0 }))
    const user = renderPage()

    await fill(user, /商品名/, '無料サンプル')
    await fill(user, /価格/, '0')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(await screen.findByText('一覧画面')).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: '無料サンプル',
      price: 0,
      description: null,
      imageUrl: null,
    })
  })

  it('必須項目が未入力の場合はエラーを表示し、送信しない', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = renderPage()

    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(screen.getByText('商品名を入力してください')).toBeInTheDocument()
    expect(screen.getByText('価格を入力してください')).toBeInTheDocument()
    expect(screen.getByLabelText(/商品名/)).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('エラーが出た項目を入力し直すと、その項目のエラー表示が消える', async () => {
    vi.spyOn(globalThis, 'fetch')
    const user = renderPage()

    await user.click(screen.getByRole('button', { name: '登録する' }))
    await user.type(screen.getByLabelText(/商品名/), '手編みのマフラー')

    expect(screen.queryByText('商品名を入力してください')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/商品名/)).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('価格を入力してください')).toBeInTheDocument()
  })

  it.each(['-1', '1.5', 'abc', '１０００'])('価格が「%s」の場合はエラーを表示する', async (price) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = renderPage()

    await fill(user, /商品名/, '手編みのマフラー')
    await fill(user, /価格/, price)
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(screen.getByText('価格は0円以上の整数で入力してください')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('文字数の上限を超えた場合はエラーを表示する', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = renderPage()

    await fill(user, /商品名/, 'あ'.repeat(101))
    await fill(user, /価格/, '1000')
    await fill(user, '商品説明', 'あ'.repeat(1001))
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(screen.getByText('商品名は100文字以内で入力してください')).toBeInTheDocument()
    expect(screen.getByText('商品説明は1000文字以内で入力してください')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('画像URLが http(s):// で始まらない場合はエラーを表示する', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = renderPage()

    await fill(user, /商品名/, '手編みのマフラー')
    await fill(user, /価格/, '3500')
    await fill(user, '画像URL', 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(
      screen.getByText('画像URLは http:// または https:// で始まるURLを入力してください'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('バックエンドの入力チェックで弾かれた場合は、項目ごとのエラーを表示して画面に留まる', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(400, {
        message: '入力内容に誤りがあります',
        errors: { name: '商品名は100文字以内で入力してください' },
      }),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()

    await fill(user, /商品名/, '手編みのマフラー')
    await fill(user, /価格/, '3500')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(await screen.findByText('入力内容に誤りがあります。')).toBeInTheDocument()
    expect(screen.getByText('商品名は100文字以内で入力してください')).toBeInTheDocument()
    expect(screen.queryByText('一覧画面')).not.toBeInTheDocument()
  })

  it('通信に失敗した場合はエラーメッセージを表示し、再度送信できる', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()

    await fill(user, /商品名/, '手編みのマフラー')
    await fill(user, /価格/, '3500')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(
      await screen.findByText('商品を登録できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登録する' })).toBeEnabled()
    expect(screen.getByLabelText(/商品名/)).toHaveValue('手編みのマフラー')
  })

  it('送信中はボタンを押せない（二重登録の防止）', async () => {
    // 応答を返さない通信にして、送信中の状態を確認する
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))
    const user = renderPage()

    await fill(user, /商品名/, '手編みのマフラー')
    await fill(user, /価格/, '3500')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    expect(screen.getByRole('button', { name: '登録中...' })).toBeDisabled()
  })

  it('キャンセルで商品一覧画面に戻る', async () => {
    const user = renderPage()

    await user.click(screen.getByRole('link', { name: 'キャンセル' }))

    expect(screen.getByText('一覧画面')).toBeInTheDocument()
  })
})
