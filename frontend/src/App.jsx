import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import { useAuth } from './auth/useAuth.js'
import LoginPage from './pages/LoginPage.jsx'
import ProductCreatePage from './pages/ProductCreatePage.jsx'
import ProductDetailPage from './pages/ProductDetailPage.jsx'
import ProductEditPage from './pages/ProductEditPage.jsx'
import ProductListPage from './pages/ProductListPage.jsx'
import PurchaseCompletePage from './pages/PurchaseCompletePage.jsx'
import PurchasePage from './pages/PurchasePage.jsx'

/** ヘッダー（画面設計書：「Handmade Marche ［ログアウト］」） */
function SiteHeader() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)

  const handleLogout = async () => {
    setLoggingOut(true)
    setLogoutError(null)
    try {
      // 成功すると未ログインになり、RequireAuth がログイン画面へ移動させる
      await logout()
    } catch (err) {
      console.error(err)
      setLogoutError('ログアウトできませんでした。')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <h1 className="site-title">
          <Link to="/products">Handmade Marche</Link>
        </h1>
        {user && (
          <div className="site-user">
            <span className="site-user-name">{user.loginId} さん</span>
            <button type="button" className="button button-secondary" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'ログアウト中...' : 'ログアウト'}
            </button>
            {logoutError && (
              <span className="field-error" role="alert">
                {logoutError}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function App() {
  return (
    <AuthProvider>
      <SiteHeader />
      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* ここから下はログインが必要な画面 */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/new" element={<ProductCreatePage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductEditPage />} />
            <Route path="/purchase/:id" element={<PurchasePage />} />
            <Route path="/purchase/complete/:id" element={<PurchaseCompletePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  )
}

export default App
