import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function FindDonorsSection() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(null);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleSelect = (group) => {
    setSelectedBloodGroup(group);
    setIsDropdownOpen(false);
  };

  return (
    <View className="px-5 my-6">
      <Text className="text-white text-xl font-bold mb-4">Find Blood Donors</Text>
      
      <View className="bg-darkCard rounded-2xl p-5 shadow-lg shadow-black elevation-4">
        <View className="gap-4 mb-6">
          <View className="gap-2">
            <Text className="text-grayText text-sm font-semibold">Blood Group</Text>
            <TouchableOpacity 
              className="flex-row justify-between items-center bg-darkSubCard rounded-xl px-4 py-3.5 border border-darkBorder"
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Text className={selectedBloodGroup ? "text-white text-base" : "text-lightGrayText text-base"}>
                {selectedBloodGroup ? selectedBloodGroup : 'Select Type (e.g., O+)'}
              </Text>
              <Feather name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#888" />
            </TouchableOpacity>

            {isDropdownOpen && (
              <View className="bg-darkSubCard rounded-xl border border-darkBorder mt-1 overflow-hidden">
                {bloodGroups.map((group, index) => (
                  <TouchableOpacity 
                    key={index} 
                    className={`py-3 px-4 border-darkBorder ${index !== bloodGroups.length - 1 ? 'border-b' : ''}`}
                    onPress={() => handleSelect(group)}
                  >
                    <Text className="text-grayText text-base">{group}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-grayText text-sm font-semibold">Search Radius</Text>
            <TouchableOpacity className="flex-row justify-between items-center bg-darkSubCard rounded-xl px-4 py-3.5 border border-darkBorder">
              <Text className="text-lightGrayText text-base">Select Area (e.g., 10km)</Text>
              <Feather name="chevron-down" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity className="bg-primary rounded-xl py-4 flex-row justify-center items-center">
          <Feather name="search" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text className="text-white text-base font-bold tracking-wide">SEARCH DONORS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
