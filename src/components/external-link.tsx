import { StyleSheet, Text } from 'react-native';

import { ExternalIcon } from '@/components/icons';
import { TactilePressable } from '@/components/tactile-pressable';
import type { DesktopLinkId } from '@/constants/links';
import { spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { openExternalHref } from '@/services/desktop-bridge';

type ExternalLinkProps = {
  href: string;
  label: string;
  /** Stable ID for the desktop allowlist; ignored when the bridge is absent. */
  linkId?: DesktopLinkId;
  compact?: boolean;
};

export function ExternalLink({
  href,
  label,
  linkId,
  compact = false,
}: ExternalLinkProps) {
  const colors = useAppColors();

  return (
    <TactilePressable
      accessibilityRole="link"
      accessibilityHint="Opens in your browser"
      onPress={() => void openExternalHref(href, linkId)}
      style={({ pressed }) => [
        styles.link,
        compact && styles.compact,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: colors.accent }]}>{label}</Text>
      <ExternalIcon color={colors.accent} size={compact ? 15 : 17} />
    </TactilePressable>
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
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
