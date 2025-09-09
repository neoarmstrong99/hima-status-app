import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  Switch,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Filter, UserPlus, Settings, Copy } from 'lucide-react-native';
import { getUser } from '@/lib/auth';
import { getGroupMembers, updateMemberStatus, updateTomorrowPlans } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import { statusOptions, tomorrowPlanOptions, getExpirationTime, getTimeRemaining, isExpired } from '@/lib/statusManager';

export default function GroupDetailScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await getUser();
      if (!userData) {
        router.replace('/');
        return;
      }
      setUser(userData);

      // グループ情報を取得
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (groupError) {
        throw groupError;
      }
      if (!group) {
        throw new Error('グループが見つかりません');
      }
      setGroupInfo(group);

      // メンバー情報を取得
      const membersData = await getGroupMembers(groupId);
      
      // 期限切れステータスをチェック
      const updatedMembers = membersData.map(member => {
        if (member.status === 'free' && member.status_expires_at && isExpired(member.status_expires_at)) {
          // 期限切れの場合、DBを更新
          updateMemberStatus(groupId, member.user_id, 'busy');
          return {
            ...member,
            status: 'busy',
            status_expires_at: null,
            status_label: null,
          };
        }
        return member;
      });

      setMembers(updatedMembers);

      // 自分の明日の予定を取得
      const myMember = updatedMembers.find(m => m.user_id === userData.id);
      if (myMember) {
        setSelectedPlans(myMember.tomorrow_plans || []);
      }

    } catch (error) {
      showToast('データの読み込みに失敗しました', 'error');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'busy' | 'free') => {
    if (newStatus === 'free') {
      setShowStatusModal(true);
    } else {
      try {
        await updateMemberStatus(groupId, user.id, 'busy', null, null);
        await loadData();
        showToast('ステータスを更新しました', 'success');
      } catch (error) {
        showToast('ステータス更新に失敗しました', 'error');
      }
    }
  };

  const handleStatusOptionSelect = async (option) => {
    try {
      const expiresAt = getExpirationTime(option);
      await updateMemberStatus(groupId, user.id, 'free', expiresAt, option.label);
      setShowStatusModal(false);
      await loadData();
      showToast(`${option.label}に設定しました`, 'success');
    } catch (error) {
      showToast('ステータス更新に失敗しました', 'error');
    }
  };

  const handlePlanToggle = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const savePlans = async () => {
    try {
      await updateTomorrowPlans(groupId, user.id, selectedPlans);
      setShowPlansModal(false);
      await loadData();
      showToast('明日の予定を更新しました', 'success');
    } catch (error) {
      showToast('予定の更新に失敗しました', 'error');
    }
  };

  const copyInviteCode = async () => {
    if (groupInfo) {
      try {
        const baseUrl = window.location.hostname === 'localhost' 
          ? window.location.origin 
          : 'https://yjccok1c9hnuklegyllfki6o5.bolt.host';
        const inviteUrl = `${baseUrl}/join/${groupInfo.invite_code}`;
        
        if (Platform.OS === 'web') {
          // Web環境ではクリップボードにコピー
          const message = `暇ステータス管理アプリのグループ「${groupInfo.name}」に参加してください！\n\n招待リンク: ${inviteUrl}\n\n（招待コードで手動参加: ${groupInfo.invite_code}）\n\n※リンクが動かない場合は、アプリを開いてから招待コードを手動入力してください`;
          await navigator.clipboard.writeText(message);
          showToast('招待リンクをクリップボードにコピーしました', 'success');
        } else {
          // モバイル環境では標準の共有機能を使用
          await Share.share({
            message: `暇ステータス管理アプリのグループ「${groupInfo.name}」に参加してください！\n\n招待リンク: ${inviteUrl}\n\n（または招待コード: ${groupInfo.invite_code} を手動入力）`,
            url: inviteUrl,
          });
        }
      } catch (error) {
        showToast(
          Platform.OS === 'web' 
            ? 'クリップボードへのコピーに失敗しました' 
            : '招待リンクの共有に失敗しました', 
          'error'
        );
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      
      // リアルタイム購読
      const membersSubscription = supabase
        .channel('members-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'members',
            filter: `group_id=eq.${groupId}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(membersSubscription);
      };
    }, [groupId])
  );

  const renderMemberItem = ({ item: member }) => {
    const isCurrentUser = member.user_id === user?.id;
    const timeRemaining = member.status === 'free' && member.status_expires_at 
      ? getTimeRemaining(member.status_expires_at) 
      : null;

    const memberPlans = member.tomorrow_plans || [];
    const planLabels = memberPlans
      .map(planId => tomorrowPlanOptions.find(opt => opt.id === planId))
      .filter(Boolean)
      .map(opt => opt.emoji + opt.label)
      .join(' ');

    return (
      <View style={[styles.memberItem, isCurrentUser && styles.currentUserItem]}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {member.nickname}
            {isCurrentUser && <Text style={styles.youLabel}> (あなた)</Text>}
          </Text>
          
          <View style={styles.memberStatus}>
            <StatusBadge 
              status={member.status} 
              label={member.status_label}
              size="medium"
            />
            {timeRemaining && (
              <Text style={styles.timeRemaining}>{timeRemaining}</Text>
            )}
          </View>

          {planLabels ? (
            <Text style={styles.tomorrowPlans}>明日: {planLabels}</Text>
          ) : null}
        </View>

        {isCurrentUser && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={[styles.statusButton, member.status === 'free' ? styles.busyButton : styles.freeButton]}
              onPress={() => handleStatusChange(member.status === 'busy' ? 'free' : 'busy')}
            >
              <Text style={styles.statusButtonText}>
                {member.status === 'busy' ? '暇になる' : '忙しくなる'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.plansButton}
              onPress={() => setShowPlansModal(true)}
            >
              <Text style={styles.plansButtonText}>明日の予定</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredMembers = filterFreeOnly 
    ? members.filter(m => m.status === 'free')
    : members;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {groupInfo?.name || 'グループ'}
            </Text>
            {groupInfo && (
              <Text style={styles.headerSubtitle}>
                #{groupInfo.invite_code}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={copyInviteCode}
          >
            <UserPlus size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {members.filter(m => m.status === 'free').length}/{members.length} 人が暇
          </Text>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={16} color="#6B7280" />
            <Text style={styles.filterText}>
              {filterFreeOnly ? '暇だけ表示' : '全員表示'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.membersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filterFreeOnly ? '暇な人がいません' : 'メンバーがいません'}
            </Text>
          </View>
        }
      />

      {/* ステータス選択モーダル */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>どのくらい暇？</Text>
            
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.statusOption}
                onPress={() => handleStatusOptionSelect(option)}
              >
                <Text style={styles.statusOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 明日の予定モーダル */}
      <Modal
        visible={showPlansModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlansModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>明日の予定</Text>
            <Text style={styles.modalSubtitle}>暇な時間帯を選んでください（複数選択可）</Text>
            
            {tomorrowPlanOptions.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planOption,
                  selectedPlans.includes(plan.id) && styles.planOptionSelected
                ]}
                onPress={() => handlePlanToggle(plan.id)}
              >
                <Text style={styles.planEmoji}>{plan.emoji}</Text>
                <Text style={[
                  styles.planText,
                  selectedPlans.includes(plan.id) && styles.planTextSelected
                ]}>
                  {plan.label}
                </Text>
                {selectedPlans.includes(plan.id) && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowPlansModal(false)}
              >
                <Text style={styles.secondaryButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={savePlans}
              >
                <Text style={styles.primaryButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* フィルターモーダル */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>表示フィルター</Text>
            
            <TouchableOpacity
              style={styles.switchOption}
              onPress={() => setFilterFreeOnly(!filterFreeOnly)}
            >
              <Text style={styles.switchOptionText}>暇な人だけ表示</Text>
              <Switch
                value={filterFreeOnly}
                onValueChange={setFilterFreeOnly}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={filterFreeOnly ? '#3B82F6' : '#F3F4F6'}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.primaryButtonText}>適用</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  membersList: {
    padding: 16,
  },
  memberItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  memberInfo: {
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  youLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: 'normal',
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  tomorrowPlans: {
    fontSize: 12,
    color: '#6B7280',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  freeButton: {
    backgroundColor: '#10B981',
  },
  busyButton: {
    backgroundColor: '#6B7280',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  plansButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  plansButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    fontWeight: '500',
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  planOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  planEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  planText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  planTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  switchOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
