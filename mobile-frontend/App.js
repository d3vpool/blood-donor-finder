import { StatusBar } from 'expo-status-bar';
import { ScrollView, SafeAreaView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Header from './src/components/Header';
import HeroSection from './src/components/HeroSection';
import StatisticsSection from './src/components/StatisticsSection';
import FindDonorsSection from './src/components/FindDonorsSection';
import BecomeDonorSection from './src/components/BecomeDonorSection';
import AboutSection from './src/components/AboutSection';
import Footer from './src/components/Footer';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-darkLayout">
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={{ flex: 1 }}
      >
        <Header />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <HeroSection />
          <StatisticsSection />
          <FindDonorsSection />
          <BecomeDonorSection />
          <AboutSection />
        </ScrollView>
        <Footer />
      </LinearGradient>
    </SafeAreaView>
  );
}
