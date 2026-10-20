import { useContext } from 'react'
import { AuthContext } from './AuthContext.js'

/** ログイン状態と、ログイン・ログアウトの操作を取得する */
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth は AuthProvider の内側で使ってください')
  }
  return auth
}
