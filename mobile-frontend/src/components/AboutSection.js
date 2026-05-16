import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AboutSection() {
  return (
    <View className="px-5 my-6 gap-4">
      <Text className="text-white text-xl font-bold mb-2">About Blood Donation</Text>

      {/* Mission Card */}
      <View className="bg-darkCard rounded-2xl p-5 shadow-lg elevation-4">
        <View className="flex-row items-center mb-4 gap-2">
          <MaterialCommunityIcons name="heart-pulse" size={24} color="#ff5a3c" />
          <Text className="text-white text-lg font-semibold">Our Mission</Text>
        </View>
        <View className="flex-row items-center mb-3 pr-2.5">
          <View className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
          <Text className="text-grayText text-[15px] leading-[22px]">Save up to 3 lives per donation</Text>
        </View>
        <View className="flex-row items-center mb-3 pr-2.5">
          <View className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
          <Text className="text-grayText text-[15px] leading-[22px]">Support local hospital patients</Text>
        </View>
        <View className="flex-row items-center mb-3 pr-2.5">
          <View className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
          <Text className="text-grayText text-[15px] leading-[22px]">Build a healthier community</Text>
        </View>
      </View>

      {/* Compatibility Chart Card */}
      <View className="bg-darkCard rounded-2xl p-5 shadow-lg elevation-4">
        <View className="flex-row items-center mb-4 gap-2">
          <MaterialCommunityIcons name="water-percent" size={24} color="#ff5a3c" />
          <Text className="text-white text-lg font-semibold">Blood Compatibility Chart</Text>
        </View>
        
        <View className="flex-row flex-wrap gap-3">
          <View className="flex-row items-center py-2 px-3 rounded-[20px] bg-darkSubCard gap-2 min-w-[45%] flex-1">
            <Text className="text-white font-bold text-base">O-</Text>
            <Text className="text-[#aaaaaa] text-xs shrink-1">Universal Donor</Text>
          </View>
          
          <View className="flex-row items-center py-2 px-3 rounded-[20px] bg-darkSubCard gap-2 min-w-[45%] flex-1">
            <Text className="text-white font-bold text-base">AB+</Text>
            <Text className="text-[#aaaaaa] text-xs shrink-1">Universal Recipient</Text>
          </View>
          
          <View className="flex-row items-center py-2 px-3 rounded-[20px] bg-darkSubCard gap-2 min-w-[45%] flex-1">
            <Text className="text-white font-bold text-base">O+</Text>
            <Text className="text-[#aaaaaa] text-xs shrink-1">Most Common</Text>
          </View>
          
          <View className="flex-row items-center py-2 px-3 rounded-[20px] bg-darkSubCard gap-2 min-w-[45%] flex-1">
            <Text className="text-white font-bold text-base">AB-</Text>
            <Text className="text-[#aaaaaa] text-xs shrink-1">Rarest Type</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
