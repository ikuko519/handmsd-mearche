import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct } from '../api/products.js'
import ProductImage from '../components/ProductImage.jsx'
import { formatPrice } from '../utils/format.js'

/**
 * 商品詳細画面（画面設計書：商品詳細画面 /products/{id}）。
 * GET /api/products/{id} で選んだ商品の画像・商品名・価格・説明を表示し、購入画面へ進めるようにする。
 */
function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    // 画面を離れたときに通信を中断する
    const controller = new AbortController()

    fetchProduct(id, { signal: controller.signal })
      .then((data) => setProduct(data))
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error(err)
        setLoadError(
          err.status === 404 || err.status === 400
            ? '指定された商品が見つかりません。すでに削除された可能性があります。'
            : '商品情報を取得できませんでした。時間をおいて再度お試しください。',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [id])

  let content
  if (loading) {
    content = (
      <p className="message" role="status">
        商品情報を読み込み中です...
      </p>
    )
  } else if (loadError) {
    content = (
      <>
        <p className="message message-error" role="alert">
          {loadError}
        </p>
        <p className="back-link">
          <Link to="/products">商品一覧に戻る</Link>
        </p>
      </>
    )
  } else {
    content = (
      <div className="product-detail">
        <ProductImage src={product.imageUrl} alt={product.name} />
        <div className="product-detail-body">
          <dl className="purchase-details">
            <dt>商品名</dt>
            <dd>{product.name}</dd>
            <dt>価格</dt>
            <dd className="purchase-price">{formatPrice(product.price)}</dd>
            <dt>説明</dt>
            <dd className="product-detail-description">
              {product.description || <span className="text-muted">説明はありません。</span>}
            </dd>
          </dl>
          <div className="form-actions">
            <Link to="/products" className="button button-secondary">
              一覧へ戻る
            </Link>
            <Link to={`/purchase/${product.id}`} className="button">
              購入へ進む
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section>
      <h2 className="page-title">商品詳細</h2>
      {content}
    </section>
  )
}

export default ProductDetailPage
