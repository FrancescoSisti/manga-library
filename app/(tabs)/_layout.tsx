import { Tabs } from 'expo-router';
import React from 'react';

import { NeonTabBar } from '@/components/NeonTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <NeonTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
        }}
      />
    </Tabs>
  );
}
