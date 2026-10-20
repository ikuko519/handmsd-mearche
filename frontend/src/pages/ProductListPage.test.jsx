import { fireEvent, render, screen } from '@testing-library/react'
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
