import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchProducts } from '../api/products.js'
import ProductImage from '../components/ProductImage.jsx'

/** 価格を「3,500円」の形式にする */
function formatPrice(price) {
  return `${price.toLocaleString('ja-JP')}円`
}

/**
 * 商品一覧画面（画面設計書：商品一覧画面）。
 * 登録されている商品をカード形式で一覧表示する。
 */
function ProductListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // 商品登録画面から戻ってきたときの完了メッセージ
  const [notice] = useState(location.state?.message ?? null)

  useEffect(() => {
    // 再読み込みで完了メッセージが再表示されないよう、受け取ったら履歴から消しておく
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  useEffect(() => {
    // 画面を離れたときに通信を中断する
    const controller = new AbortController()

    fetchProducts({ signal: controller.signal })
      .then((data) => setProducts(data))
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error(err)
        setError('商品一覧を表示できませんでした。時間をおいて再度お試しください。')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  let content
  if (loading) {
    content = (
      <p className="message" role="status">
        商品を読み込み中です...
      </p>
    )
  } else if (error) {
    content = (
      <p className="message message-error" role="alert">
        {error}
      </p>
    )
  } else if (products.length === 0) {
    content = <p className="message">現在、出品されている商品はありません。</p>
  } else {
    content = (
      <ul className="product-grid">
        {products.map((product) => (
          <li key={product.id} className="product-card">
            <ProductImage src={product.imageUrl} alt={product.name} />
            <div className="product-body">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">{formatPrice(product.price)}</p>
              {product.description && (
                <p className="product-description">{product.description}</p>
              )}
              <div className="product-actions">
                <Link
                  to={`/products/${product.id}/edit`}
                  className="button button-secondary"
                  aria-label={`${product.name}を編集する`}
                >
                  編集する
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section>
      <div className="page-header">
        <h2 className="page-title">商品一覧</h2>
        <Link to="/products/new" className="button">
          商品を登録する
        </Link>
      </div>
      {notice && (
        <p className="message message-success" role="status">
          {notice}
        </p>
      )}
      {content}
    </section>
  )
}

export default ProductListPage
