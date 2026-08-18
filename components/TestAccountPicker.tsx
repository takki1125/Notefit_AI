import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { styles } from '../theme/styles';
import {
  TEST_ACCOUNTS,
  phaseLabel,
  trainingLevelLabel,
  type TestAccount,
} from '../utils/testAccounts';

type Props = {
  currentEmail?: string | null;
  disabled?: boolean;
  onSelect: (account: TestAccount) => void;
};

export function TestAccountPicker({ currentEmail, disabled, onSelect }: Props) {
  return (
    <View>
      {TEST_ACCOUNTS.map((account, index) => {
        const selected = currentEmail === account.email;
        const isLast = index === TEST_ACCOUNTS.length - 1;
        return (
          <TouchableOpacity
            key={account.email}
            style={[styles.routineItem, !isLast && { marginBottom: 10 }]}
            onPress={() => onSelect(account)}
            disabled={disabled || selected}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineNameText}>{account.username}</Text>
                <Text style={styles.routineDescText}>
                  {trainingLevelLabel(account.trainingLevel)} ・ {phaseLabel(account.phase)}
                </Text>
              </View>
              {selected ? <Check color="#2ecc71" size={20} /> : null}
            </View>
          </TouchableOpacity>
        );
      })}
      {disabled ? (
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : null}
    </View>
  );
}
