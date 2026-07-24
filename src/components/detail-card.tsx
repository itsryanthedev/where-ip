import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radii, shadows, spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

type DetailCardProps = {
  label: string;
  value: string;
  supportingText?: string;
  leading?: ReactNode;
};

export function DetailCard({
  label,
  value,
  supportingText,
  leading,
}: DetailCardProps) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: `${shadows.card} ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.labelRow}>
        {leading}
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text selectable style={[styles.value, { color: colors.text }]}>
        {value}
      </Text>
      {supportingText ? (
        <Text selectable style={[styles.supporting, { color: colors.textMuted }]}>
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 220,
    minHeight: 132,
    borderWidth: 1,
    borderRadius: radii.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  labelRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  supporting: {
    fontSize: 13,
    lineHeight: 18,
  },
});
