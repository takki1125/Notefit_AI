import React, { useState } from 'react';
import { Alert, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { auth } from '../firebaseConfig';
import { signInToTestAccount, type TestAccount } from '../utils/testAccounts';
import { TestAccountPicker } from './TestAccountPicker';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TestAccountSwitcherModal({ visible, onClose }: Props) {
  const [switching, setSwitching] = useState(false);

  const handleSelect = async (account: TestAccount) => {
    if (auth.currentUser?.email === account.email) {
      onClose();
      return;
    }
    setSwitching(true);
    try {
      await signInToTestAccount(account.email);
    } catch {
      Alert.alert('切り替え失敗', 'テストアカウントの切り替えに失敗しました。シード済みか確認してください。');
      setSwitching(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={switching ? undefined : onClose} />
        <View
          style={{
            backgroundColor: '#1a1a1a',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 28,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>アカウントを切り替え</Text>
              <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>テストアカウント同士のみ切り替えできます</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={switching} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>
          <TestAccountPicker
            currentEmail={auth.currentUser?.email}
            disabled={switching}
            onSelect={handleSelect}
          />
        </View>
      </View>
    </Modal>
  );
}
