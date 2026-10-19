# Handmade Marche

学校の修了制作。ハンドメイド作品を出品・購入できるマーケットアプリ。

## 技術構成

| 区分 | 技術 |
| --- | --- |
| フロントエンド | React + Vite |
| バックエンド | Java 21 / Spring Boot (Maven) |
| データベース | H2 Database（ファイルモード） |

## フォルダ構成

```
Handmade Marche/
├── frontend/   React アプリ (http://localhost:5173)
└── backend/    Spring Boot API (http://localhost:8080)
```

## 起動方法

### バックエンド

```bash
cd backend
./mvnw spring-boot:run      # Windows (PowerShell) は .\mvnw.cmd spring-boot:run
```

- 動作確認: http://localhost:8080/api/health
- H2 コンソール: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./data/handmade-marche` / ユーザー名: `sa` / パスワード: なし

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 を開き、「バックエンド: 接続OK」と表示されれば連携成功。
