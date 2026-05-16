import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function HeroSection() {
  return (
    <View className="px-6 py-10 items-center">
      <View className="mb-8 items-center">
        <Text className="text-white text-[32px] font-extrabold text-center leading-[40px] mb-4">
          Every Drop Counts.{'\n'}Every Life Matters.
        </Text>
        <Text className="text-grayText text-base text-center leading-6 px-2.5">
          Connect with blood donors in your area and help save lives.
        </Text>
      </View>

      <View className="w-full gap-4">
        <TouchableOpacity 
          className="bg-primary py-4 rounded-xl items-center shadow-lg elevation-[5]"
          style={{ shadowColor: '#ff5a3c' }}
        >
          <Text className="text-white text-base font-bold tracking-wide">Find Donors Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="bg-transparent py-4 rounded-xl items-center border-2 border-darkBorder">
          <Text className="text-white text-base font-bold tracking-wide">Become a Donor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
