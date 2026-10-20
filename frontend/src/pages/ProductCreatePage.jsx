import { useNavigate } from 'react-router-dom'
import { createProduct } from '../api/products.js'
import ProductForm from '../components/ProductForm.jsx'

/**
 * 商品登録画面。入力した商品を POST /api/products で登録し、商品一覧画面に戻る。
 */
function ProductCreatePage() {
  const navigate = useNavigate()

  const handleSubmit = async (product) => {
    await createProduct(product)
    navigate('/products', { state: { message: '商品を登録しました。' } })
  }

  return (
    <section>
      <h2 className="page-title">商品登録</h2>
      <ProductForm
        submitLabel="登録する"
        submittingLabel="登録中..."
        onSubmit={handleSubmit}
        getSubmitErrorMessage={() => '商品を登録できませんでした。時間をおいて再度お試しください。'}
      />
    </section>
  )
}

export default ProductCreatePage
