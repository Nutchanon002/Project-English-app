// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, usePathname } from 'expo-router'; 
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native'; 
import 'react-native-reanimated';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // 1. เช็คสถานะ User จาก Firebase
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, [initializing]);

  // 2. ระบบป้องกัน (Auth Guard)
  useEffect(() => {
    if (initializing) return;
    const isAuthPage = pathname === '/' || pathname === '/register';

    if (!user && !isAuthPage) {
      router.replace('/');
    } else if (user && isAuthPage) {
      router.replace('/tabs');
    }
  }, [user, initializing, pathname, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (

    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" /> 
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" /> 
        <Stack.Screen name="tabs" /> 
        <Stack.Screen name="topics" />
        <Stack.Screen name="lesson" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="pretest" /> 
        <Stack.Screen name="register" />
      </Stack>
    </ThemeProvider>
  );
}