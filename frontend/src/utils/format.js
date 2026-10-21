// 画面に表示する値の書式

/** 価格を「3,500円」の形式にする */
export function formatPrice(price) {
  return `${price.toLocaleString('ja-JP')}円`
}

/**
 * APIの日時（「2026-10-21T14:05:30」）を「2026/10/21 14:05」の形式にする。
 * バックエンドの日時はタイムゾーンを持たないため、Date に変換せず文字列のまま組み替える。
 */
export function formatDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? '')
  if (!match) return value ?? ''
  const [, year, month, day, hour, minute] = match
  return `${year}/${month}/${day} ${hour}:${minute}`
}
