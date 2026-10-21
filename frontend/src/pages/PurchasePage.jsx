import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProduct } from '../api/products.js'
import { createPurchase } from '../api/purchases.js'
import { formatPrice } from '../utils/format.js'

/**
 * 購入画面（画面設計書：購入画面 /purchase/{id}）。
 * GET /api/products/{id} で購入する商品を表示し、「購入確定」で POST /api/purchases を呼んで購入完了画面へ進む。
 * 本格的な決済は行わない。
 */
function PurchasePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

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

  const handlePurchase = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const purchase = await createPurchase(product.id)
      // ブラウザの「戻る」で購入画面に戻り、もう一度購入してしまわないよう、履歴を置き換える
      navigate(`/purchase/complete/${purchase.id}`, { replace: true })
    } catch (err) {
      console.error(err)
      setSubmitError(
        err.status === 404
          ? 'この商品はすでに削除されているため、購入できません。'
          : '購入できませんでした。時間をおいて再度お試しください。',
      )
      setSubmitting(false)
    }
  }

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
      <div className="purchase-panel">
        {submitError && (
          <p className="message message-error message-inline" role="alert">
            {submitError}
          </p>
        )}
        <dl className="purchase-details">
          <dt>商品名</dt>
          <dd>{product.name}</dd>
          <dt>価格</dt>
          <dd className="purchase-price">{formatPrice(product.price)}</dd>
        </dl>
        <div className="form-actions">
          {/* 商品詳細画面ができるまでは、商品一覧に戻る */}
          <Link to="/products" className="button button-secondary">
            商品一覧へ戻る
          </Link>
          <button type="button" className="button" onClick={handlePurchase} disabled={submitting}>
            {submitting ? '購入処理中...' : '購入確定'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <section>
      <h2 className="page-title">購入内容の確認</h2>
      {content}
    </section>
  )
}

export default PurchasePage
