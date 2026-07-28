import { useWindowDimensions } from 'react-native';

import {
  compactBreakpoint,
  tabletBreakpoint,
} from '@/constants/theme';

export function useBreakpoint(): {
  width: number;
  height: number;
  isCompact: boolean;
  isTabletOrLarger: boolean;
} {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isCompact: width < compactBreakpoint,
    isTabletOrLarger: width >= tabletBreakpoint,
  };
}
