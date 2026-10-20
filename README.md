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

http://localhost:5173 を開くとログイン画面が表示される。

### ログイン

すべての画面・API（`/api/health` を除く）はログインが必要。
初回起動時、利用者が1人もいなければ次の初期ユーザーが作成される（開発・デモ用）。

| ログインID | パスワード |
| --- | --- |
| `user1` | `password123` |

初期ユーザーは `backend/src/main/resources/application.properties` の `app.initial-user.*` で変更できる
（すでに利用者がいる場合は作成されないため、変更を反映するには `backend/data/` を削除してから起動する）。

## テスト

```bash
cd backend && ./mvnw test     # Windows (PowerShell) は .\mvnw.cmd test
cd frontend && npm test
```
