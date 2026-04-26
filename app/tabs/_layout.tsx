// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#ffb938', // สีตอนกด (สีแดงตามธีม)
        tabBarInactiveTintColor: 'gray',
    }}>
        {/* 1. หน้าหลัก */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'หน้าหลัก',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        
        {/* 2. หน้าแบบฝึกหัด (สร้างไฟล์นี้ในขั้นตอนถัดไป) */}
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'แบบฝึกหัด',
            tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          }}
        />

        {/* 3. หน้าโปรไฟล์ (สร้างไฟล์นี้ในขั้นตอนถัดไป) */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'โปรไฟล์',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />
    </Tabs>
  );
}
