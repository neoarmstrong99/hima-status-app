# 暇ステータス管理アプリ

友達と暇ステータスを共有できるリアルタイムアプリです。

## 機能

- ✅ ユーザー登録（ローカルストレージ）
- ✅ グループ作成・参加
- ✅ リアルタイムステータス共有
- ✅ 招待コード・招待リンク機能
- ✅ 明日の予定設定
- ✅ 通知機能
- ✅ データのインポート・エクスポート

## 技術スタック

- **フロントエンド**: React Native (Expo)
- **バックエンド**: Supabase
- **データベース**: PostgreSQL
- **認証**: ローカル認証
- **リアルタイム**: Supabase Realtime
- **ホスティング**: Bolt Hosting

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- Expo CLI
- Supabase アカウント

### インストール

```bash
npm install
```

### 環境変数設定

`.env.example` をコピーして `.env` ファイルを作成：

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### データベースセットアップ

1. Supabaseプロジェクトを作成
2. `supabase/migrations/` 内のSQLファイルを順番に実行
3. RLSポリシーが正しく設定されていることを確認

### 開発サーバー起動

```bash
npm run dev
```

## デプロイ

### Web版デプロイ

```bash
npm run build:web
```

### モバイルアプリビルド

```bash
expo build:android
expo build:ios
```

## データベーススキーマ

### Groups テーブル
- `id`: UUID (Primary Key)
- `name`: TEXT (グループ名)
- `invite_code`: TEXT (招待コード)
- `created_at`: TIMESTAMPTZ
- `created_by`: TEXT (作成者ID)

### Members テーブル
- `id`: UUID (Primary Key)
- `user_id`: TEXT (ユーザーID)
- `group_id`: UUID (グループID)
- `nickname`: TEXT (ニックネーム)
- `status`: TEXT ('busy' | 'free')
- `status_expires_at`: TIMESTAMPTZ
- `status_label`: TEXT
- `tomorrow_plans`: TEXT[]
- `notification_enabled`: BOOLEAN
- `joined_at`: TIMESTAMPTZ
- `last_active`: TIMESTAMPTZ

## ライセンス

MIT License
