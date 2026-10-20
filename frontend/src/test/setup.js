// テスト共通の準備。toBeInTheDocument() などの判定を使えるようにする
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// 本番では Spring Security が発行する CSRFトークンの Cookie。テストでは固定値を入れておく
export const TEST_CSRF_TOKEN = 'test-csrf-token'

beforeEach(() => {
  document.cookie = `XSRF-TOKEN=${TEST_CSRF_TOKEN}; path=/`
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
