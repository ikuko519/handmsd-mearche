import { createContext } from 'react'

/**
 * ログイン状態を画面全体で共有するための Context。中身は AuthProvider が用意する。
 * - user: ログイン中の利用者（{ loginId }）。未ログインなら null
 * - checking: 起動直後のログイン状態の確認中なら true
 * - signedOutReason: 未ログインになった理由（'logout' / 'expired' / null）
 * - login(loginId, password) / logout()
 */
export const AuthContext = createContext(null)
