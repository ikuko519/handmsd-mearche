import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, createProduct } from '../api/products.js'

const initialForm = { name: '', price: '', description: '', imageUrl: '' }

/** 入力チェック。バックエンド（ProductCreateRequest）と同じルールにしている */
function validate(form) {
  const errors = {}

  if (form.name.trim() === '') {
    errors.name = '商品名を入力してください'
  } else if (form.name.trim().length > 100) {
    errors.name = '商品名は100文字以内で入力してください'
  }

  if (form.price.trim() === '') {
    errors.price = '価格を入力してください'
  } else if (!/^\d+$/.test(form.price.trim())) {
    errors.price = '価格は0円以上の整数で入力してください'
  }

  if (form.description.length > 1000) {
    errors.description = '商品説明は1000文字以内で入力してください'
  }

  const imageUrl = form.imageUrl.trim()
  if (imageUrl.length > 500) {
    errors.imageUrl = '画像URLは500文字以内で入力してください'
  } else if (imageUrl !== '' && !/^https?:\/\/\S+$/.test(imageUrl)) {
    errors.imageUrl = '画像URLは http:// または https:// で始まるURLを入力してください'
  }

  return errors
}

/** 入力欄1つ分（ラベル・入力・エラーメッセージ） */
function FormField({ id, label, required, error, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required">必須</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * 商品登録画面。入力した商品を POST /api/products で登録し、商品一覧画面に戻る。
 */
function ProductCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // 入力し直した項目のエラー表示は消す（次の送信時に改めてチェックする）
    setErrors((prev) => {
      if (!prev[name]) return prev
      const { [name]: _removed, ...rest } = prev
      return rest
    })
  }

  /** 入力欄に付ける、エラー表示用の属性 */
  const errorProps = (field) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await createProduct({
        name: form.name.trim(),
        price: Number(form.price.trim()),
        description: form.description.trim() === '' ? null : form.description,
        imageUrl: form.imageUrl.trim() === '' ? null : form.imageUrl.trim(),
      })
      navigate('/products', { state: { message: '商品を登録しました。' } })
    } catch (err) {
      console.error(err)
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        // バックエンドの入力チェックで弾かれた場合は、該当項目の下に表示する
        setErrors(err.fieldErrors)
        setSubmitError('入力内容に誤りがあります。')
      } else {
        setSubmitError('商品を登録できませんでした。時間をおいて再度お試しください。')
      }
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2 className="page-title">商品登録</h2>

      {submitError && (
        <p className="message message-error" role="alert">
          {submitError}
        </p>
      )}

      <form className="product-form" onSubmit={handleSubmit} noValidate>
        <FormField id="name" label="商品名" required error={errors.name}>
          <input id="name" name="name" type="text" value={form.name} onChange={handleChange} {...errorProps('name')} />
        </FormField>

        <FormField id="price" label="価格（円）" required error={errors.price}>
          <input
            id="price"
            name="price"
            type="text"
            inputMode="numeric"
            value={form.price}
            onChange={handleChange}
            {...errorProps('price')}
          />
        </FormField>

        <FormField id="description" label="商品説明" error={errors.description}>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={form.description}
            onChange={handleChange}
            {...errorProps('description')}
          />
        </FormField>

        <FormField id="imageUrl" label="画像URL" error={errors.imageUrl}>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={form.imageUrl}
            onChange={handleChange}
            {...errorProps('imageUrl')}
          />
        </FormField>

        <div className="form-actions">
          <Link to="/products" className="button button-secondary">
            キャンセル
          </Link>
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? '登録中...' : '登録する'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProductCreatePage
