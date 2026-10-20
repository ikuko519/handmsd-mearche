import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProduct, updateProduct } from '../api/products.js'
import ProductForm from '../components/ProductForm.jsx'

/** APIの商品データを入力欄の値（すべて文字列）に変換する */
function toFormValues(product) {
  return {
    name: product.name,
    price: String(product.price),
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
  }
}

/**
 * 商品編集画面。GET /api/products/{id} で現在の商品情報を表示し、
 * PUT /api/products/{id} で更新して商品一覧画面に戻る。
 */
function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
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

  const handleSubmit = async (values) => {
    await updateProduct(id, values)
    navigate('/products', { state: { message: '商品を更新しました。' } })
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
      <ProductForm
        initialValues={toFormValues(product)}
        submitLabel="更新する"
        submittingLabel="更新中..."
        onSubmit={handleSubmit}
        getSubmitErrorMessage={(err) =>
          err.status === 404
            ? 'この商品はすでに削除されているため、更新できません。'
            : '商品を更新できませんでした。時間をおいて再度お試しください。'
        }
      />
    )
  }

  return (
    <section>
      <h2 className="page-title">商品編集</h2>
      {content}
    </section>
  )
}

export default ProductEditPage
