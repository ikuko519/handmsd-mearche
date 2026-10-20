import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/products.js'

/** 価格を「3,500円」の形式にする */
function formatPrice(price) {
  return `${price.toLocaleString('ja-JP')}円`
}

/**
 * 商品一覧画面（画面設計書：商品一覧画面）。
 * 登録されている商品をカード形式で一覧表示する。
 */
function ProductListPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  if (loading) {
    return (
      <p className="message" role="status">
        商品を読み込み中です...
      </p>
    )
  }

  if (error) {
    return (
      <p className="message message-error" role="alert">
        {error}
      </p>
    )
  }

  if (products.length === 0) {
    return <p className="message">現在、出品されている商品はありません。</p>
  }

  return (
    <section>
      <h2 className="page-title">商品一覧</h2>
      <ul className="product-grid">
        {products.map((product) => (
          <li key={product.id} className="product-card">
            {/* 商品画像は未実装のため枠のみ表示 */}
            <div className="product-image" aria-hidden="true">
              商品画像
            </div>
            <div className="product-body">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">{formatPrice(product.price)}</p>
              {product.description && (
                <p className="product-description">{product.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProductListPage
