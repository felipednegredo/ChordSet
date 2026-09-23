import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../src/components';
import { useTheme } from '../../src/theme';

function tabIcon(name: IconName, focusedName: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? focusedName : name} size={26} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Cifras', tabBarIcon: tabIcon('musical-notes-outline', 'musical-notes') }}
      />
      <Tabs.Screen
        name="repertoires"
        options={{ title: 'Repertórios', tabBarIcon: tabIcon('list-outline', 'list') }}
      />
      <Tabs.Screen
        name="tuner"
        options={{ title: 'Afinador', tabBarIcon: tabIcon('pulse-outline', 'pulse') }}
      />
    </Tabs>
  );
}
