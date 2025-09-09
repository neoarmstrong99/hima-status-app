/*
  # メンバーテーブルの作成

  1. New Tables
    - `members`
      - `id` (uuid, primary key) - メンバーID
      - `user_id` (text) - ユーザーID (ローカルストレージから)
      - `group_id` (uuid) - グループID (外部キー)
      - `nickname` (text) - ニックネーム
      - `status` (text) - ステータス ('busy' or 'free')
      - `status_expires_at` (timestamptz, nullable) - ステータス有効期限
      - `status_label` (text, nullable) - ステータスラベル
      - `tomorrow_plans` (text[], default empty array) - 明日の予定
      - `notification_enabled` (boolean, default true) - 通知有効フラグ
      - `joined_at` (timestamptz) - 参加日時
      - `last_active` (timestamptz) - 最終アクティブ時刻
  
  2. Security
    - Enable RLS on `members` table
    - Add policies for group member access
    
  3. Indexes
    - Index on group_id for efficient queries
    - Index on user_id for user lookups
*/

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  status text NOT NULL DEFAULT 'busy' CHECK (status IN ('busy', 'free')),
  status_expires_at timestamptz,
  status_label text,
  tomorrow_plans text[] DEFAULT '{}',
  notification_enabled boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーがメンバー情報を読み取り可能
CREATE POLICY "Anyone can read members"
  ON members
  FOR SELECT
  TO public
  USING (true);

-- 全てのユーザーがメンバーとして参加可能
CREATE POLICY "Anyone can join as member"
  ON members
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 自分の情報のみ更新可能
CREATE POLICY "Users can update own member data"
  ON members
  FOR UPDATE
  TO public
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'user_id');

-- 効率的なクエリのためのインデックス
CREATE INDEX IF NOT EXISTS members_group_id_idx ON members(group_id);
CREATE INDEX IF NOT EXISTS members_user_id_idx ON members(user_id);
CREATE INDEX IF NOT EXISTS members_status_idx ON members(status);
