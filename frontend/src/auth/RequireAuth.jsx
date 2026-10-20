import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'

const signedOutMessages = {
  logout: { text: 'ログアウトしました。', type: 'success' },
  expired: { text: 'ログインの有効期限が切れました。もう一度ログインしてください。', type: 'error' },
}

/**
 * ログインが必要な画面を囲む部品。未ログインならログイン画面へ移動する。
 * ログイン後に元の画面へ戻れるよう、開こうとしていたURLを渡す。
 */
function RequireAuth() {
  const { user, checking, signedOutReason } = useAuth()
  const location = useLocation()

  if (checking) {
    return (
      <p className="message" role="status">
        ログイン状態を確認中です...
      </p>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          // ログアウトした場合は、次のログイン後に商品一覧から始める
          from: signedOutReason === 'logout' ? null : location.pathname,
          notice: signedOutMessages[signedOutReason] ?? null,
        }}
      />
    )
  }

  return <Outlet />
}

export default RequireAuth
