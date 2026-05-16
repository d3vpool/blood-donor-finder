import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function Footer() {
  return (
    <View className="bg-footerBg px-5 py-[30px] border-t border-darkHeaderBorder">
      <View className="flex-row justify-between items-center mb-5">
        <Text className="text-white text-xl font-bold tracking-widest">LifeLink</Text>
        <View className="flex-row items-center bg-footerContactBg px-3 py-1.5 rounded-xl border border-footerContactBorder gap-1.5">
          <MaterialIcons name="phone-in-talk" size={16} color="#ff5a3c" />
          <Text className="text-primary text-sm font-bold">1-800-DONATE</Text>
        </View>
      </View>

      <View className="flex-row justify-center items-center flex-wrap mb-5 gap-2.5">
        <TouchableOpacity>
          <Text className="text-grayText text-sm">Home</Text>
        </TouchableOpacity>
        <Text className="text-[#444444] text-sm">•</Text>
        <TouchableOpacity>
          <Text className="text-grayText text-sm">Find Donors</Text>
        </TouchableOpacity>
        <Text className="text-[#444444] text-sm">•</Text>
        <TouchableOpacity>
          <Text className="text-grayText text-sm">Register</Text>
        </TouchableOpacity>
        <Text className="text-[#444444] text-sm">•</Text>
        <TouchableOpacity>
          <Text className="text-grayText text-sm">About</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-[#666666] text-xs text-center">
        © {new Date().getFullYear()} LifeLink. All rights reserved.
      </Text>
    </View>
  );
}
