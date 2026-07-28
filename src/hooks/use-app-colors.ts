import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from '@/constants/theme';

export function useAppColors() {
  const colorScheme = useColorScheme();
  // Static web rendering has no reliable color-scheme signal. Keeping one
  // deterministic web palette avoids a light-server/dark-client hydration mix.
  if (process.env.EXPO_OS === 'web') {
    return lightColors;
  }
  return colorScheme === 'dark' ? darkColors : lightColors;
}
