import React from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';

import { styles } from '../../theme/styles';
import { useExerciseMaster } from '../../hooks/useExerciseMaster';

type ExerciseSelectorModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
};

export default function ExerciseSelectorModal({
  visible,
  onClose,
  onSelect,
}: ExerciseSelectorModalProps) {
  const { categories, selectedCategory, loading, setSelectedCategory } = useExerciseMaster(visible);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>種目を選択</Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ height: 50 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.tabBtn,
                      selectedCategory?.id === cat.id && styles.activeTabBtn,
                      cat.sections.length === 0 && { opacity: 0.5 },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedCategory?.id === cat.id && styles.activeTabText,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <SectionList
              sections={selectedCategory?.sections || []}
              keyExtractor={(item, index) => item + index}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseListItem}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={styles.exerciseListText}>{item}</Text>
                  <Plus color="#2ecc71" size={20} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666' }}>種目がありません</Text>
                </View>
              }
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

