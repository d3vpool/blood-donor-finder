import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function BecomeDonorSection() {
  return (
    <View className="px-5 my-4">
      <View className="bg-lightCard rounded-2xl p-8 items-center shadow-lg elevation-4">
        <Text className="text-darkLayout text-[22px] font-bold mb-2 text-center">Become a Blood Donor</Text>
        <Text className="text-[#666666] text-base mb-6 text-center">
          Wants to save lives? Please login first.
        </Text>
        
        <TouchableOpacity className="bg-primary py-3.5 px-10 rounded-[25px] min-w-[160px] items-center">
          <Text className="text-white text-base font-bold tracking-widest">LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
