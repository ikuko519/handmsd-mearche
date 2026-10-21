import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchPurchase } from '../api/purchases.js'
import { formatDateTime } from '../utils/format.js'

/** 取得に失敗したときのメッセージ */
function loadErrorMessage(err) {
  if (err.status === 403) return 'この購入情報は表示できません。'
  if (err.status === 404 || err.status === 400) return '購入情報が見つかりません。'
  return '購入情報を取得できませんでした。時間をおいて再度お試しください。'
}

/**
 * 購入完了画面（画面設計書：購入完了画面 /purchase/complete/{id}）。
 * GET /api/purchases/{id} で購入結果を取得し、購入した商品と購入日時を表示する。
 */
function PurchaseCompletePage() {
  const { id } = useParams()
  const [purchase, setPurchase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    // 画面を離れたときに通信を中断する
    const controller = new AbortController()

    fetchPurchase(id, { signal: controller.signal })
      .then((data) => setPurchase(data))
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error(err)
        setLoadError(loadErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [id])

  if (loading) {
    return (
      <p className="message" role="status">
        購入情報を読み込み中です...
      </p>
    )
  }

  if (loadError) {
    return (
      <section>
        <p className="message message-error" role="alert">
          {loadError}
        </p>
        <p className="back-link">
          <Link to="/products">商品一覧に戻る</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="purchase-complete">
      <h2 className="page-title">ご購入ありがとうございます</h2>
      <div className="purchase-panel">
        <p className="purchase-complete-message">購入が完了しました</p>
        <dl className="purchase-details">
          <dt>商品名</dt>
          <dd>{purchase.productName}</dd>
          <dt>購入日時</dt>
          <dd>{formatDateTime(purchase.purchaseDate)}</dd>
        </dl>
      </div>
      <p className="back-link">
        <Link to="/products">商品一覧に戻る</Link>
      </p>
    </section>
  )
}

export default PurchaseCompletePage
