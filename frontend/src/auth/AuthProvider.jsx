import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMe, login as loginApi, logout as logoutApi } from '../api/auth.js'
import { UNAUTHORIZED_EVENT } from '../api/http.js'
import { AuthContext } from './AuthContext.js'

/**
 * ログイン状態を管理する。
 * 起動時に GET /api/me でログイン中かどうかを確認し、APIが 401 を返したらログイン切れとして扱う。
 */
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [signedOutReason, setSignedOutReason] = useState(null)

  // 起動時：すでにログインしているか（セッションが残っているか）を確認する
  useEffect(() => {
    const controller = new AbortController()

    fetchMe({ signal: controller.signal })
      .then((me) => setUser(me))
      .catch((err) => {
        if (err.name === 'AbortError') return
        // 確認できない場合は未ログインとして扱い、ログイン画面を表示する
        console.error(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false)
      })

    return () => controller.abort()
  }, [])

  // 操作中にセッションが切れた（APIが 401 を返した）場合
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setSignedOutReason('expired')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(async (loginId, password) => {
    const me = await loginApi(loginId, password)
    setUser(me)
    setSignedOutReason(null)
    return me
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setUser(null)
    setSignedOutReason('logout')
  }, [])

  const value = useMemo(
    () => ({ user, checking, signedOutReason, login, logout }),
    [user, checking, signedOutReason, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
