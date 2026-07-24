import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { TactilePressable } from '@/components/tactile-pressable';
import { radii, shadows, spacing } from '@/constants/theme';
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
    <TactilePressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor:
            pressed && !isDisabled
              ? variant === 'primary'
                ? colors.accentPressed
                : colors.backgroundAccent
              : backgroundColor,
          borderColor:
            variant === 'plain'
              ? colors.border
              : pressed && !isDisabled && variant === 'primary'
                ? colors.accentPressed
                : backgroundColor,
          boxShadow:
            variant === 'plain'
              ? undefined
              : `${shadows.control} ${colors.shadow}`,
          opacity: isDisabled ? 0.52 : pressed ? 0.9 : 1,
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
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.control,
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
