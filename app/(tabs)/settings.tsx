import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import {
  User,
  Bell,
  Download,
  Upload,
  Trash2,
  Info,
  Shield,
} from 'lucide-react-native';
import { Platform } from 'react-native';
import { getUser, clearUser } from '../../lib/auth';
import { getNotificationSettings, updateNotificationSettings, registerForPushNotificationsAsync } from '../../lib/notifications';
import { exportData, importData } from '../../lib/storage';
import { Toast } from '../../components/Toast';

export default function SettingsScreen() {
  const [user, setUser] = useState(null);
  const [notificationSettings, setNotificationSettingsState] = useState({
    enabled: true,
    groupSettings: {},
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const loadData = async () => {
    try {
      const userData = await getUser();
      setUser(userData);

      const settings = await getNotificationSettings();
      setNotificationSettingsState(settings);
    } catch (error) {
      showToast('設定の読み込みに失敗しました', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      if (enabled) {
        const token = await registerForPushNotificationsAsync();
        if (Platform.OS !== 'web' && !token) {
          // 実機で通知登録に失敗した場合のみエラー
          showToast('通知の許可が必要です', 'error');
          return;
        }
      }

      const newSettings = { ...notificationSettings, enabled };
      await updateNotificationSettings(newSettings);
      setNotificationSettingsState(newSettings);
      
      showToast(
        enabled ? '通知を有効にしました' : '通知を無効にしました',
        'success'
      );
    } catch (error) {
      console.error('通知設定エラー:', error);
      showToast(
        Platform.OS === 'web' 
          ? '設定を保存しました（Web版では通知機能は制限されます）'
          : '通知設定の変更に失敗しました',
        Platform.OS === 'web' ? 'info' : 'error'
      );
    }
  };

  const handleExportData = async () => {
    try {
      const fileUri = await exportData();
      Alert.alert(
        'エクスポート完了',
        'データをエクスポートしました。ファイルを共有してバックアップしてください。',
        [
          { text: 'OK', style: 'default' },
        ]
      );
      showToast('データをエクスポートしました', 'success');
    } catch (error) {
      showToast('エクスポートに失敗しました', 'error');
    }
  };

  const handleImportData = async () => {
    Alert.alert(
      'データインポート',
      '現在の設定が上書きされます。続行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '続行',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await importData();
              if (success) {
                showToast('データをインポートしました', 'success');
                await loadData();
              } else {
                showToast('インポートがキャンセルされました', 'info');
              }
            } catch (error) {
              showToast('インポートに失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'データ削除',
      'すべてのデータが削除されます。この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearUser();
              showToast('データを削除しました', 'success');
              setUser(null);
            } catch (error) {
              showToast('削除に失敗しました', 'error');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent && (
        <View style={styles.settingRight}>
          {rightComponent}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <SettingItem
            icon={<User size={20} color="#3B82F6" />}
            title="ニックネーム"
            subtitle={user.nickname}
          />
          <SettingItem
            icon={<Shield size={20} color="#3B82F6" />}
            title="匿名ID"
            subtitle={user.id.substring(0, 8) + '...'}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知</Text>
        <SettingItem
          icon={<Bell size={20} color="#3B82F6" />}
          title="プッシュ通知"
          subtitle="メンバーが暇になったときに通知"
          rightComponent={
            <Switch
              value={notificationSettings.enabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={notificationSettings.enabled ? '#3B82F6' : '#F3F4F6'}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>データ管理</Text>
        <SettingItem
          icon={<Download size={20} color="#10B981" />}
          title="データエクスポート"
          subtitle="設定とデータをバックアップ"
          onPress={handleExportData}
        />
        <SettingItem
          icon={<Upload size={20} color="#F59E0B" />}
          title="データインポート"
          subtitle="バックアップから復元"
          onPress={handleImportData}
        />
        <SettingItem
          icon={<Trash2 size={20} color="#EF4444" />}
          title="すべてのデータを削除"
          subtitle="ニックネームと設定をリセット"
          onPress={handleClearAllData}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリについて</Text>
        <SettingItem
          icon={<Info size={20} color="#6B7280" />}
          title="バージョン"
          subtitle="1.0.0"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          暇ステータス管理アプリ
        </Text>
        <Text style={styles.footerSubtext}>
          友達と暇時間を共有しよう
        </Text>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRight: {
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
});
