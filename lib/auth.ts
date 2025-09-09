import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

export interface UserData {
  id: string;
  nickname: string;
}

const USER_KEY = 'hima_app_user';

export const getUser = async (): Promise<UserData | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const setUser = async (nickname: string): Promise<UserData> => {
  const userData: UserData = {
    id: uuidv4(),
    nickname: nickname.trim(),
  };
  
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    return userData;
  } catch (error) {
    console.error('Error saving user:', error);
    throw new Error('ユーザー情報の保存に失敗しました');
  }
};

export const clearUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error clearing user:', error);
  }
};
