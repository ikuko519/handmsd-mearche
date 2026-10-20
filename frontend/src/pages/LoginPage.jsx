import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../api/http.js'
import { useAuth } from '../auth/useAuth.js'

/** 入力チェック（画面設計書：ログインID・パスワードとも必須） */
function validate(form) {
  const errors = {}
  if (form.loginId.trim() === '') errors.loginId = 'ログインIDを入力してください'
  if (form.password === '') errors.password = 'パスワードを入力してください'
  return errors
}

/**
 * ログイン画面（画面設計書：ログイン画面）。
 * 認証に成功したら商品一覧画面（またはログイン前に開こうとしていた画面）へ移動する。
 */
function LoginPage() {
  const { user, checking, login } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ loginId: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // ログアウト・ログイン切れのお知らせ（RequireAuth から渡される）
  const notice = location.state?.notice

  if (checking) {
    return (
      <p className="message" role="status">
        ログイン状態を確認中です...
      </p>
    )
  }

  // ログイン済み（ログイン成功直後を含む）なら、目的の画面へ移動する
  if (user) {
    return <Navigate to={location.state?.from ?? '/products'} replace />
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      if (!prev[name]) return prev
      const { [name]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await login(form.loginId.trim(), form.password)
      // 成功すると user が設定され、上の <Navigate> で画面が切り替わる
    } catch (err) {
      console.error(err)
      if (err instanceof ApiError && err.status === 401) {
        setSubmitError('ログインIDまたはパスワードが正しくありません。')
      } else if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors)
      } else {
        setSubmitError('ログインできませんでした。時間をおいて再度お試しください。')
      }
      // 失敗したらパスワード欄は空にする
      setForm((prev) => ({ ...prev, password: '' }))
      setSubmitting(false)
    }
  }

  const errorProps = (field) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })

  return (
    <section className="login-page">
      <h2 className="page-title">ログイン</h2>

      {notice && !submitError && (
        <p className={`message message-inline message-${notice.type}`} role="status">
          {notice.text}
        </p>
      )}
      {submitError && (
        <p className="message message-error message-inline" role="alert">
          {submitError}
        </p>
      )}

      <form className="product-form login-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="loginId">ログインID</label>
          <input
            id="loginId"
            name="loginId"
            type="text"
            autoComplete="username"
            value={form.loginId}
            onChange={handleChange}
            {...errorProps('loginId')}
          />
          {errors.loginId && (
            <p id="loginId-error" className="field-error">
              {errors.loginId}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            {...errorProps('password')}
          />
          {errors.password && (
            <p id="password-error" className="field-error">
              {errors.password}
            </p>
          )}
        </div>

        <button type="submit" className="button button-block" disabled={submitting}>
          {submitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </section>
  )
}

export default LoginPage
