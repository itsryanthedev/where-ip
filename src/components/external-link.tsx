import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ExternalIcon } from '@/components/icons';
import { spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

type ExternalLinkProps = {
  href: string;
  label: string;
  compact?: boolean;
};

export function ExternalLink({ href, label, compact = false }: ExternalLinkProps) {
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint="Opens in your browser"
      onPress={() => void Linking.openURL(href)}
      style={({ pressed }) => [
        styles.link,
        compact && styles.compact,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: colors.accent }]}>{label}</Text>
      <ExternalIcon color={colors.accent} size={compact ? 15 : 17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  compact: {
    minHeight: 36,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
