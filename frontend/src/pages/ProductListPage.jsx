import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { deleteProduct, fetchProducts } from '../api/products.js'
import ProductImage from '../components/ProductImage.jsx'
import { formatPrice } from '../utils/format.js'

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
  // 完了メッセージ（登録・編集画面から戻ってきたとき、削除したとき）
  const [notice, setNotice] = useState(location.state?.message ?? null)
  const [deleteError, setDeleteError] = useState(null)
  // 削除処理中の商品ID（二重クリック防止）
  const [deletingId, setDeletingId] = useState(null)

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

  const handleDelete = async (product) => {
    if (!window.confirm(`「${product.name}」を削除しますか？\nこの操作は取り消せません。`)) return

    setNotice(null)
    setDeleteError(null)
    setDeletingId(product.id)
    const removeFromList = () => setProducts((prev) => prev.filter((p) => p.id !== product.id))
    try {
      await deleteProduct(product.id)
      removeFromList()
      setNotice(`「${product.name}」を削除しました。`)
    } catch (err) {
      console.error(err)
      if (err.status === 404) {
        // 別の画面などですでに削除されていた場合は、一覧からも消す
        removeFromList()
        setNotice(`「${product.name}」はすでに削除されていました。`)
      } else if (err.status === 409) {
        setDeleteError(`「${product.name}」は購入されているため、削除できません。`)
      } else {
        setDeleteError(`「${product.name}」を削除できませんでした。時間をおいて再度お試しください。`)
      }
    } finally {
      setDeletingId(null)
    }
  }

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
                {/* 商品詳細画面ができるまでの、購入画面への入口 */}
                <Link
                  to={`/purchase/${product.id}`}
                  className="button"
                  aria-label={`${product.name}の購入へ進む`}
                >
                  購入へ進む
                </Link>
                <Link
                  to={`/products/${product.id}/edit`}
                  className="button button-secondary"
                  aria-label={`${product.name}を編集する`}
                >
                  編集する
                </Link>
                <button
                  type="button"
                  className="button button-danger"
                  aria-label={`${product.name}を削除する`}
                  disabled={deletingId !== null}
                  onClick={() => handleDelete(product)}
                >
                  {deletingId === product.id ? '削除中...' : '削除する'}
                </button>
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
      {deleteError && (
        <p className="message message-error message-inline" role="alert">
          {deleteError}
        </p>
      )}
      {content}
    </section>
  )
}

export default ProductListPage
