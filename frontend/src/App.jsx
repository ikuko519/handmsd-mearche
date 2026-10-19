import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('確認中...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(`接続OK (${data.status})`))
      .catch(() => setStatus('バックエンドに接続できません'))
  }, [])

  return (
    <main className="container">
      <h1>Handmade Marche</h1>
      <p>ハンドメイド作品のマーケット</p>
      <p className="status">バックエンド: {status}</p>
    </main>
  )
}

export default App
