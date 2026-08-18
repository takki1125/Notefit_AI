import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';

import { PRIVACY_POLICY_MARKDOWN } from '../../constants/privacyPolicyMarkdown';
import { styles as shared } from '../../theme/styles';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PrivacyPolicyModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={shared.modalHeader}>
          <Text style={shared.modalTitle}>利用規約 兼 プライバシーポリシー</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="閉じる">
            <X color="#fff" size={28} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll} contentInsetAdjustmentBehavior="automatic">
          <Markdown style={markdownStyles}>{PRIVACY_POLICY_MARKDOWN}</Markdown>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalScroll: {
    padding: 20,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24,
    paddingBottom: 40,
  },
  heading1: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  heading3: {
    color: '#eee',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  list_item: {
    marginBottom: 5,
  },
  bullet_list: {
    marginBottom: 15,
  },
  strong: {
    fontWeight: 'bold',
    color: '#fff',
  },
  link: {
    color: '#2ecc71',
    textDecorationLine: 'none',
  },
});
