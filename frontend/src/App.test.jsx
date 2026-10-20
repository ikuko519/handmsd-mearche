import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockBackend, renderApp } from './test/mockBackend.jsx'

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

describe('商品編集から一覧表示までの流れ', () => {
  it('一覧画面で商品を選び「編集する」→ 更新 → 一覧画面に変更内容が反映される', async () => {
    mockBackend([
      { id: 1, name: '手編みのマフラー', price: 3500, description: 'ウール100%です。', imageUrl: null },
      { id: 2, name: '木製スプーン', price: 1200, description: '山桜です。', imageUrl: null },
    ])
    const user = renderApp('/products')

    await user.click(await screen.findByRole('link', { name: '木製スプーンを編集する' }))

    expect(screen.getByRole('heading', { name: '商品編集' })).toBeInTheDocument()
    const nameInput = await screen.findByLabelText(/商品名/)
    expect(nameInput).toHaveValue('木製スプーン')

    await user.clear(nameInput)
    await user.type(nameInput, '木製スプーン（大）')
    await user.clear(screen.getByLabelText(/価格/))
    await user.type(screen.getByLabelText(/価格/), '1500')
    await user.type(screen.getByLabelText('画像URL'), 'https://example.com/spoon.jpg')
    await user.click(screen.getByRole('button', { name: '更新する' }))

    expect(await screen.findByText('商品を更新しました。')).toBeInTheDocument()
    expect(await screen.findByText('木製スプーン（大）')).toBeInTheDocument()
    expect(screen.getByText('1,500円')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '木製スプーン（大）' })).toHaveAttribute(
      'src',
      'https://example.com/spoon.jpg',
    )
    // 編集していない商品はそのまま
    expect(screen.getByText('手編みのマフラー')).toBeInTheDocument()
    expect(screen.getByText('3,500円')).toBeInTheDocument()
    expect(screen.queryByText('木製スプーン')).not.toBeInTheDocument()
  })
})

describe('商品削除の流れ', () => {
  it('一覧画面で商品を削除すると、別の画面から戻っても一覧に表示されない', async () => {
    mockBackend([
      { id: 1, name: '手編みのマフラー', price: 3500, description: null, imageUrl: null },
      { id: 2, name: '木製スプーン', price: 1200, description: null, imageUrl: null },
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = renderApp('/products')

    await user.click(await screen.findByRole('button', { name: '手編みのマフラーを削除する' }))
    expect(await screen.findByText('「手編みのマフラー」を削除しました。')).toBeInTheDocument()

    // 登録画面へ移動してキャンセルで戻る（一覧をAPIから取り直す）
    await user.click(screen.getByRole('link', { name: '商品を登録する' }))
    await user.click(screen.getByRole('link', { name: 'キャンセル' }))

    expect(await screen.findByRole('heading', { name: '木製スプーン' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '手編みのマフラー' })).not.toBeInTheDocument()
  })
})
