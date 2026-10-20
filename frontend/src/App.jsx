import { Link, Navigate, Route, Routes } from 'react-router-dom'
import ProductCreatePage from './pages/ProductCreatePage.jsx'
import ProductListPage from './pages/ProductListPage.jsx'

function App() {
  return (
    <>
      <header className="site-header">
        <h1 className="site-title">
          <Link to="/products">Handmade Marche</Link>
        </h1>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductCreatePage />} />
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
