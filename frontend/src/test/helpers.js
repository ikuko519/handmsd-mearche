// テスト用の共通関数

/** fetch の戻り値（Response）を作る */
export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
