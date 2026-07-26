import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

export default function BecomeDonorSection({ user, isDonor = false, snoozedUntil = null, onUpdateStatus }) {
  const [snoozeState, setSnoozeState] = useState(snoozedUntil);
  const isSnoozedActive = snoozeState && snoozeState > Date.now();

  const handleAvailable = () => {
    setSnoozeState(null);
    if (onUpdateStatus) onUpdateStatus(null);
    Alert.alert("Status Updated", "You are now marked as available to donate blood.");
  };

  const handleSnooze = () => {
    const snoozeTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
    setSnoozeState(snoozeTime);
    if (onUpdateStatus) onUpdateStatus(snoozeTime);
    Alert.alert("Snoozed", "Your donor availability is snoozed for 30 days.");
  };

  if (isDonor) {
    return (
      <View className="px-5 my-4">
        <View className="bg-lightCard rounded-2xl p-6 items-center shadow-lg elevation-4">
          <View className="flex-row items-center mb-3">
            <View className={`w-3 h-3 rounded-full mr-2 ${isSnoozedActive ? 'bg-amber-500' : 'bg-green-500'}`} />
            <Text className="text-darkLayout text-sm font-bold">
              {isSnoozedActive ? 'Status: Snoozed' : 'Status: Active (Available)'}
            </Text>
          </View>

          <Text className="text-darkLayout text-[22px] font-bold mb-1 text-center">Donor Availability</Text>
          <Text className="text-[#666666] text-xs mb-4 text-center">
            Toggle your availability to receive local emergency blood requests.
          </Text>

          {isSnoozedActive && (
            <View className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl mb-4 w-full items-center">
              <Text className="text-amber-800 text-xs font-semibold">
                Snoozed for {Math.max(1, Math.ceil((snoozeState - Date.now()) / (1000 * 60 * 60 * 24)))} more days
              </Text>
            </View>
          )}

          <View className="w-full gap-2.5">
            <TouchableOpacity 
              onPress={handleAvailable}
              className={`py-3 px-5 rounded-xl border items-center ${!isSnoozedActive ? 'bg-green-600 border-green-600' : 'bg-gray-100 border-gray-300'}`}
            >
              <Text className={`font-bold text-sm ${!isSnoozedActive ? 'text-white' : 'text-gray-700'}`}>
                ✓ Available to Donate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSnooze}
              className={`py-3 px-5 rounded-xl border items-center ${isSnoozedActive ? 'bg-gray-800 border-gray-800' : 'bg-gray-100 border-gray-300'}`}
            >
              <Text className={`font-bold text-sm ${isSnoozedActive ? 'text-white' : 'text-gray-700'}`}>
                💤 Snooze for 30 Days
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="px-5 my-4">
      <View className="bg-lightCard rounded-2xl p-8 items-center shadow-lg elevation-4">
        <Text className="text-darkLayout text-[22px] font-bold mb-2 text-center">Become a Blood Donor</Text>
        <Text className="text-[#666666] text-base mb-6 text-center">
          Want to save lives? Please login first.
        </Text>
        
        <TouchableOpacity className="bg-primary py-3.5 px-10 rounded-[25px] min-w-[160px] items-center">
          <Text className="text-white text-base font-bold tracking-widest">LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
