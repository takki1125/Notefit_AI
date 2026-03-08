import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../../theme/styles';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type CalendarSectionProps = {
  trainedDays: number[];
  onDayPress: (day: number) => void;
};

export default function CalendarSection({ trainedDays, onDayPress }: CalendarSectionProps) {
  const today = new Date();
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={styles.card}>
      <View style={styles.calendarHeader}>
        <Text style={styles.monthText}>{currentMonth}</Text>
        <Text style={styles.yearText}>{currentYear}</Text>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {days.map(day => {
          const isToday = day === currentDay;
          const isTrained = trainedDays.includes(day);

          return (
            <TouchableOpacity
              key={day}
              style={styles.dayCell}
              onPress={() => onDayPress(day)}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.activeDayCircle,
                  isTrained && !isToday && styles.trainedDayCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.activeDayText,
                    isTrained && !isToday && styles.trainedDayText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

