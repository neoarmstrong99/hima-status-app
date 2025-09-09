import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export const exportData = async () => {
  try {
    const userData = await AsyncStorage.getItem('hima_app_user');
    const notificationSettings = await AsyncStorage.getItem('hima_notification_settings');
    
    const exportData = {
      userData: userData ? JSON.parse(userData) : null,
      notificationSettings: notificationSettings ? JSON.parse(notificationSettings) : null,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const fileName = `hima_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
    
    return fileUri;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('データのエクスポートに失敗しました');
  }
};

export const importData = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
    });

    if (!result.canceled && result.assets[0]) {
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const importData = JSON.parse(fileContent);

      if (importData.userData) {
        await AsyncStorage.setItem('hima_app_user', JSON.stringify(importData.userData));
      }
      
      if (importData.notificationSettings) {
        await AsyncStorage.setItem('hima_notification_settings', JSON.stringify(importData.notificationSettings));
      }

      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('データのインポートに失敗しました');
  }
};
