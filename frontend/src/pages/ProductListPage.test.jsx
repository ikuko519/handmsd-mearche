import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers.js'
import ProductListPage from './ProductListPage.jsx'

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/products']}>
      <ProductListPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const muffler = { id: 3, name: '手編みのマフラー', price: 3500 }
const spoon = { id: 7, name: '木製スプーン', price: 1200 }

/**
 * fetch の代わり。一覧取得（GET）には products を返し、DELETE には deleteResponse を返す。
 * deleteResponse に関数を渡した場合は、その戻り値（Promise など）を返す。
 */
function mockFetch({ products = [muffler, spoon], deleteResponse = new Response(null, { status: 204 }) } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    if (options.method === 'DELETE') {
      return typeof deleteResponse === 'function' ? deleteResponse() : deleteResponse
    }
    return jsonResponse(200, products)
  })
}

/** DELETE が呼ばれた回数 */
function deleteCalls(fetchMock) {
  return fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')
}

describe('商品一覧画面', () => {
  it('商品名・価格・商品説明を表示する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, [{ id: 1, name: '手編みのマフラー', price: 3500, description: 'ウール100%です。' }]),
    )
    renderPage()

    expect(await screen.findByText('手編みのマフラー')).toBeInTheDocument()
    expect(screen.getByText('3,500円')).toBeInTheDocument()
    expect(screen.getByText('ウール100%です。')).toBeInTheDocument()
  })

  it('画像URLがある商品は画像を表示し、ない商品は「商品画像」の枠を表示する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, [
        { id: 1, name: '陶器のマグカップ', price: 2800, imageUrl: 'https://example.com/mug.jpg' },
        { id: 2, name: '刺繍のハンカチ', price: 900, imageUrl: null },
      ]),
    )
    renderPage()

    const image = await screen.findByRole('img', { name: '陶器のマグカップ' })
    expect(image).toHaveAttribute('src', 'https://example.com/mug.jpg')
    expect(screen.getAllByText('商品画像')).toHaveLength(1)
  })

  it('画像が読み込めない場合は「商品画像」の枠に切り替える', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, [{ id: 1, name: '陶器のマグカップ', price: 2800, imageUrl: 'https://example.com/none.jpg' }]),
    )
    renderPage()

    fireEvent.error(await screen.findByRole('img', { name: '陶器のマグカップ' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('商品画像')).toBeInTheDocument()
  })

  it('各商品に、その商品の編集画面へのリンクを表示する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, [
        { id: 3, name: '手編みのマフラー', price: 3500 },
        { id: 7, name: '木製スプーン', price: 1200 },
      ]),
    )
    renderPage()

    expect(await screen.findByRole('link', { name: '手編みのマフラーを編集する' })).toHaveAttribute(
      'href',
      '/products/3/edit',
    )
    expect(screen.getByRole('link', { name: '木製スプーンを編集する' })).toHaveAttribute('href', '/products/7/edit')
  })

  it('各商品に、その商品の詳細画面へのリンク「詳細を見る」を表示する', async () => {
    mockFetch()
    renderPage()

    const link = await screen.findByRole('link', { name: '手編みのマフラーの詳細を見る' })
    expect(link).toHaveAttribute('href', '/products/3')
    expect(link).toHaveTextContent('詳細を見る')
    expect(screen.getByRole('link', { name: '木製スプーンの詳細を見る' })).toHaveAttribute('href', '/products/7')
  })

  it('商品が0件でも「商品を登録する」ボタンを表示する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, []))
    renderPage()

    expect(await screen.findByText('現在、出品されている商品はありません。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '商品を登録する' })).toHaveAttribute('href', '/products/new')
  })

  it('取得に失敗した場合はエラーメッセージを表示する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(500, {}))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()

    expect(
      await screen.findByText('商品一覧を表示できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
  })
})

describe('商品一覧画面：商品削除', () => {
  it('各商品に削除ボタンを表示する', async () => {
    mockFetch()
    renderPage()

    expect(await screen.findByRole('button', { name: '手編みのマフラーを削除する' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '木製スプーンを削除する' })).toBeEnabled()
  })

  it('確認ダイアログでOKを押すと削除し、その商品だけ一覧から消えて完了メッセージを表示する', async () => {
    const fetchMock = mockFetch()
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '木製スプーンを削除する' }))

    expect(confirmMock).toHaveBeenCalledWith('「木製スプーン」を削除しますか？\nこの操作は取り消せません。')
    expect(await screen.findByText('「木製スプーン」を削除しました。')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '木製スプーン' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '手編みのマフラー' })).toBeInTheDocument()

    const calls = deleteCalls(fetchMock)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe('/api/products/7')
  })

  it('確認ダイアログでキャンセルを押すと削除しない', async () => {
    const fetchMock = mockFetch()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '木製スプーンを削除する' }))

    expect(deleteCalls(fetchMock)).toHaveLength(0)
    expect(screen.getByRole('heading', { name: '木製スプーン' })).toBeInTheDocument()
    expect(screen.queryByText(/削除しました/)).not.toBeInTheDocument()
  })

  it('最後の1件を削除すると「商品はありません」と表示する', async () => {
    mockFetch({ products: [muffler] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '手編みのマフラーを削除する' }))

    expect(await screen.findByText('「手編みのマフラー」を削除しました。')).toBeInTheDocument()
    expect(screen.getByText('現在、出品されている商品はありません。')).toBeInTheDocument()
  })

  it('すでに削除されていた場合（404）は、一覧から消してその旨を表示する', async () => {
    mockFetch({ deleteResponse: jsonResponse(404, { message: '商品が見つかりません（ID: 7）' }) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '木製スプーンを削除する' }))

    expect(await screen.findByText('「木製スプーン」はすでに削除されていました。')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '木製スプーン' })).not.toBeInTheDocument()
  })

  it.each([
    ['サーバーエラー（500）', () => jsonResponse(500, {})],
    ['通信失敗', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('%sの場合はエラーを表示し、商品は一覧に残り、再度削除できる', async (_label, deleteResponse) => {
    mockFetch({ deleteResponse })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '木製スプーンを削除する' }))

    expect(
      await screen.findByText('「木製スプーン」を削除できませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '木製スプーン' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '木製スプーンを削除する' })).toBeEnabled()
  })

  it('購入された商品の場合（409）は、削除できない旨を表示し、商品は一覧に残る', async () => {
    mockFetch({ deleteResponse: jsonResponse(409, { message: '購入された商品のため削除できません（ID: 7）' }) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '木製スプーンを削除する' }))

    expect(await screen.findByText('「木製スプーン」は購入されているため、削除できません。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '木製スプーン' })).toBeInTheDocument()
  })

  it('削除中はすべての削除ボタンを押せない（二重削除の防止）', async () => {
    mockFetch({ deleteResponse: () => new Promise(() => {}) })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: '木製スプーンを削除する' }))

    const deleting = screen.getByRole('button', { name: '木製スプーンを削除する' })
    expect(deleting).toBeDisabled()
    expect(deleting).toHaveTextContent('削除中...')
    expect(screen.getByRole('button', { name: '手編みのマフラーを削除する' })).toBeDisabled()
  })
})
