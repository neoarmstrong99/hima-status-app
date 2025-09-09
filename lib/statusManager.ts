import { StatusOption } from '../types';

export const statusOptions: StatusOption[] = [
  { id: 'free_2h', label: 'あと2時間暇', hours: 2 },
  { id: 'free_3h', label: 'あと3時間暇', hours: 3 },
  { id: 'free_4h', label: 'あと4時間暇', hours: 4 },
  { id: 'free_6h', label: 'あと6時間暇', hours: 6 },
  { id: 'free_today', label: '今日は暇', isAllDay: true },
  { id: 'free_mostly', label: '途中ちょい用事あるけど大体暇', isAllDay: true },
];

export const tomorrowPlanOptions = [
  { id: 'lunch', label: '昼', emoji: '🌤️' },
  { id: 'evening', label: '夕方', emoji: '🌅' },
  { id: 'night', label: '夜', emoji: '🌙' },
  { id: 'late_night', label: '深夜', emoji: '🌃' },
];

export const getExpirationTime = (option: StatusOption): string | null => {
  if (option.hours) {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + option.hours);
    return expiration.toISOString();
  } else if (option.isAllDay) {
    // 翌日の朝3時に設定
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 1);
    expiration.setHours(3, 0, 0, 0);
    return expiration.toISOString();
  }
  return null;
};

export const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
};

export const getTimeRemaining = (expiresAt: string | null): string => {
  if (!expiresAt) return '';
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return '期限切れ';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `あと${hours}時間${minutes > 0 ? minutes + '分' : ''}`;
  } else {
    return `あと${minutes}分`;
  }
};

export const checkAndResetExpiredStatuses = (members: any[]) => {
  return members.map(member => {
    if (member.status === 'free' && member.status_expires_at && isExpired(member.status_expires_at)) {
      return {
        ...member,
        status: 'busy',
        status_expires_at: null,
        status_label: null,
      };
    }
    return member;
  });
};

export const shouldClearTomorrowPlans = (): boolean => {
  const now = new Date();
  const cutoffTime = new Date();
  cutoffTime.setHours(3, 0, 0, 0);
  
  // 現在時刻が朝3時以降の場合、前日の計画をクリアする必要がある
  return now >= cutoffTime;
};
