export interface User {
  id: string;
  nickname: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  created_by: string;
}

export interface Member {
  id: string;
  user_id: string;
  group_id: string;
  nickname: string;
  status: 'busy' | 'free';
  status_expires_at: string | null;
  status_label: string | null;
  tomorrow_plans: string[];
  notification_enabled: boolean;
  joined_at: string;
  last_active: string;
}

export interface StatusOption {
  id: string;
  label: string;
  hours?: number;
  isAllDay?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  groupSettings: Record<string, boolean>;
}
