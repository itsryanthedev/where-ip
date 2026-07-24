import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'plain';
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function ActionButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityHint,
  style,
}: ActionButtonProps) {
  const colors = useAppColors();
  const isDisabled = disabled || loading;
  const backgroundColor =
    variant === 'primary'
      ? colors.accent
      : variant === 'secondary'
        ? colors.accentSoft
        : 'transparent';
  const foregroundColor =
    variant === 'primary' ? '#FFFFFF' : colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor: variant === 'plain' ? colors.border : backgroundColor,
          opacity: isDisabled ? 0.52 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} size="small" />
      ) : (
        icon
      )}
      <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
});

