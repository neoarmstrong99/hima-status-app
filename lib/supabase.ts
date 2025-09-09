import { createClient } from '@supabase/supabase-js';

// 環境変数からSupabase設定を読み込み
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // ローカル認証を使用するため無効化
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // リアルタイム更新の頻度制限
    },
  },
});
