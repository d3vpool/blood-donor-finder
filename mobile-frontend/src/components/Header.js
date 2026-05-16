import React from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function Header() {
  return (
    <View 
      className="flex-row justify-between items-center px-5 h-[60px] bg-darkLayout border-b border-darkHeaderBorder"
      style={{ marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
    >
      <TouchableOpacity className="p-2">
        <Feather name="menu" size={24} color="#ffffff" />
      </TouchableOpacity>
      
      <Text className="text-primary text-[22px] font-bold tracking-widest">LifeLink</Text>
      
      <TouchableOpacity className="p-2">
        <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#ff5a3c" />
      </TouchableOpacity>
    </View>
  );
}
