import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function StatisticsSection() {
  const stats = [
    { value: '12,000+', label: 'Donations Needed Daily' },
    { value: '3', label: 'Lives Saved Per Donation' },
    { value: '56', label: 'Days Between Donations' },
  ];

  return (
    <View className="my-5">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
      >
        {stats.map((stat, index) => (
          <View key={index} className="bg-darkCard rounded-2xl p-5 w-[140px] h-[120px] justify-center items-center shadow-lg shadow-black elevation-5">
            <Text className="text-primary text-2xl font-black mb-2 text-center">{stat.value}</Text>
            <Text className="text-white text-xs text-center leading-4 opacity-80">{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
