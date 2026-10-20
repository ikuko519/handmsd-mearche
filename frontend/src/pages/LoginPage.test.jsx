import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockBackend, renderApp } from '../test/mockBackend.jsx'

/** /api/login が呼ばれた回数 */
function loginCalls(fetchMock) {
  return fetchMock.mock.calls.filter(([url]) => url === '/api/login')
}

async function submitLogin(user, loginId, password) {
  if (loginId) await user.type(screen.getByLabelText('ログインID'), loginId)
  if (password) await user.type(screen.getByLabelText('パスワード'), password)
  await user.click(screen.getByRole('button', { name: 'ログイン' }))
}

describe('ログイン画面', () => {
  it('起動直後のログイン状態の確認中は、そのことを表示する', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))
    renderApp('/products')

    expect(screen.getByText('ログイン状態を確認中です...')).toBeInTheDocument()
  })

  it('未ログインで商品一覧を開くと、ログイン画面に移動する', async () => {
    mockBackend([], { loggedIn: false })
    renderApp('/products')

    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByLabelText('ログインID')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '商品一覧' })).not.toBeInTheDocument()
  })

  it('正しいログインIDとパスワードでログインすると、商品一覧画面に移動しヘッダーに利用者名を表示する', async () => {
    const { fetchMock } = mockBackend(
      [{ id: 1, name: '手編みのマフラー', price: 3500, description: null, imageUrl: null }],
      { loggedIn: false },
    )
    const user = renderApp('/login')
    await screen.findByRole('heading', { name: 'ログイン' })

    await submitLogin(user, 'user1', 'password123')

    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
    expect(await screen.findByText('手編みのマフラー')).toBeInTheDocument()
    const header = screen.getByRole('banner')
    expect(within(header).getByText('user1 さん')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()

    const [, options] = loginCalls(fetchMock)[0]
    expect(JSON.parse(options.body)).toEqual({ loginId: 'user1', password: 'password123' })
  })

  it('ログイン前に開こうとしていた画面に、ログイン後に移動する', async () => {
    mockBackend([], { loggedIn: false })
    const user = renderApp('/products/new')
    await screen.findByRole('heading', { name: 'ログイン' })

    await submitLogin(user, 'user1', 'password123')

    expect(await screen.findByRole('heading', { name: '商品登録' })).toBeInTheDocument()
  })

  it('パスワードが違う場合はエラーを表示し、パスワード欄を空にしてログイン画面に留まる', async () => {
    mockBackend([], { loggedIn: false })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderApp('/login')
    await screen.findByRole('heading', { name: 'ログイン' })

    await submitLogin(user, 'user1', 'wrong-password')

    expect(await screen.findByText('ログインIDまたはパスワードが正しくありません。')).toBeInTheDocument()
    expect(screen.getByLabelText('ログインID')).toHaveValue('user1')
    expect(screen.getByLabelText('パスワード')).toHaveValue('')
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('未入力の場合はエラーを表示し、ログインAPIを呼ばない', async () => {
    const { fetchMock } = mockBackend([], { loggedIn: false })
    const user = renderApp('/login')
    await screen.findByRole('heading', { name: 'ログイン' })

    await submitLogin(user, '', '')

    expect(screen.getByText('ログインIDを入力してください')).toBeInTheDocument()
    expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument()
    expect(loginCalls(fetchMock)).toHaveLength(0)
  })

  it('通信に失敗した場合はエラーメッセージを表示する', async () => {
    const { fetchMock } = mockBackend([], { loggedIn: false })
    const original = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, options) =>
      url === '/api/login' ? Promise.reject(new TypeError('Failed to fetch')) : original(url, options),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderApp('/login')
    await screen.findByRole('heading', { name: 'ログイン' })

    await submitLogin(user, 'user1', 'password123')

    expect(
      await screen.findByText('ログインできませんでした。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeEnabled()
  })

  it('ログイン中にログイン画面を開くと、商品一覧画面に移動する', async () => {
    mockBackend()
    renderApp('/login')

    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
  })
})

describe('ログアウト', () => {
  it('ログアウトするとログイン画面に移動し、商品一覧を開けなくなる', async () => {
    const { fetchMock } = mockBackend()
    const user = renderApp('/products')
    await screen.findByRole('heading', { name: '商品一覧' })

    await user.click(screen.getByRole('button', { name: 'ログアウト' }))

    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByText('ログアウトしました。')).toBeInTheDocument()
    expect(screen.queryByText('user1 さん')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, o]) => url === '/api/logout' && o.method === 'POST')).toBe(true)
  })

  it('ログアウト後に再度ログインすると、商品一覧画面に移動する', async () => {
    mockBackend()
    const user = renderApp('/products/new')
    await screen.findByRole('heading', { name: '商品登録' })

    await user.click(screen.getByRole('button', { name: 'ログアウト' }))
    await screen.findByRole('heading', { name: 'ログイン' })
    await submitLogin(user, 'user1', 'password123')

    // ログアウトした画面（商品登録）ではなく、商品一覧から始まる
    expect(await screen.findByRole('heading', { name: '商品一覧' })).toBeInTheDocument()
  })
})

describe('ログインの有効期限切れ', () => {
  it('操作中にログインが切れていた（APIが401）場合は、ログイン画面に移動してその旨を表示する', async () => {
    const backend = mockBackend([{ id: 1, name: '手編みのマフラー', price: 3500, description: null, imageUrl: null }])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = renderApp('/products')
    await screen.findByText('手編みのマフラー')

    backend.expireSession()
    await user.click(screen.getByRole('button', { name: '手編みのマフラーを削除する' }))

    expect(await screen.findByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    expect(
      screen.getByText('ログインの有効期限が切れました。もう一度ログインしてください。'),
    ).toBeInTheDocument()
  })
})
