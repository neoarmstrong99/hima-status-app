import { supabase } from './supabase';
import { Group, Member } from '../types';

export const createGroup = async (name: string, userId: string, nickname: string) => {
  const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
  
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      invite_code: inviteCode,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // グループ作成者をメンバーとして追加
  await joinGroup(group.id, userId, nickname);
  
  return group;
};

export const joinGroup = async (groupId: string, userId: string, nickname: string) => {
  console.log('joinGroup 開始:', { groupId, userId, nickname });
  
  // 既に参加しているかチェック
  const { data: existing, error: existingError } = await supabase
    .from('members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (existingError) {
    // PGRST116エラー（データが見つからない）は正常なケース
    if (existingError.code !== 'PGRST116') {
      console.error('参加チェックエラー:', existingError);
      throw existingError;
    }
  }

  if (existing) {
    console.log('既に参加済み:', existing);
    throw new Error('既にこのグループに参加しています');
  }

  console.log('新規参加処理中...');
  const { data, error } = await supabase
    .from('members')
    .insert({
      group_id: groupId,
      user_id: userId,
      nickname: nickname.trim(),
      status: 'busy',
      tomorrow_plans: [],
      notification_enabled: true,
    })
    .select()
    .single();

  if (error) {
    console.error('参加処理エラー:', error);
    throw new Error(`参加処理に失敗しました: ${error.message}`);
  }
  
  console.log('参加成功:', data);
  return data;
};

export const getGroupByInviteCode = async (inviteCode: string) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No rows');
  return data;
};

export const getUserGroups = async (userId: string) => {
  const { data, error } = await supabase
    .from('members')
    .select(`
      group_id,
      groups (
        id,
        name,
        invite_code,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
};

export const getGroupMembers = async (groupId: string) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const updateMemberStatus = async (
  groupId: string, 
  userId: string, 
  status: 'busy' | 'free',
  expiresAt?: string | null,
  label?: string | null
) => {
  // busyの場合は明示的にラベルと期限をクリア
  const updateData = {
    status,
    status_expires_at: status === 'busy' ? null : expiresAt,
    status_label: status === 'busy' ? null : label,
    last_active: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('members')
    .update(updateData)
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const updateTomorrowPlans = async (
  groupId: string,
  userId: string,
  plans: string[]
) => {
  const { error } = await supabase
    .from('members')
    .update({
      tomorrow_plans: plans,
      last_active: new Date().toISOString(),
    })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
};
