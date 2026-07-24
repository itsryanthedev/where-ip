import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { InfoIcon } from '@/components/icons';
import { spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import type { ProviderDefinition } from '@/types/ip';

type ProviderCardProps = {
  provider: ProviderDefinition;
  selected: boolean;
  onSelect: () => void;
};

export function ProviderCard({
  provider,
  selected,
  onSelect,
}: ProviderCardProps) {
  const colors = useAppColors();
  const [showPolicies, setShowPolicies] = useState(false);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={`Use ${provider.name}`}
        onPress={onSelect}
        style={({ pressed }) => [
          styles.selection,
          { opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? colors.accent : colors.textMuted,
            },
          ]}
        >
          {selected ? (
            <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
          ) : null}
        </View>
        <View style={styles.providerText}>
          <Text style={[styles.name, { color: colors.text }]}>{provider.name}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            {provider.shortDescription}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Privacy information for ${provider.name}`}
        accessibilityState={{ expanded: showPolicies }}
        accessibilityHint="Shows links to the provider's privacy policy and terms"
        onPress={() => setShowPolicies((visible) => !visible)}
        style={({ pressed }) => [
          styles.infoButton,
          {
            borderColor: colors.border,
            opacity: pressed ? 0.65 : 1,
          },
        ]}
      >
        <InfoIcon color={colors.accent} size={18} />
        <Text style={[styles.infoLabel, { color: colors.accent }]}>
          Privacy & terms
        </Text>
      </Pressable>

      {showPolicies ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.policyPanel,
            { borderTopColor: colors.border },
          ]}
        >
          <Text selectable style={[styles.policyCopy, { color: colors.textMuted }]}>
            For privacy details about this third-party provider, read its Privacy
            Policy and Terms of Use.
          </Text>
          <View style={styles.policyLinks}>
            <ExternalLink
              compact
              href={provider.privacyUrl}
              label="Privacy Policy"
            />
            <ExternalLink compact href={provider.termsUrl} label="Terms of Use" />
            <ExternalLink
              compact
              href={provider.documentationUrl}
              label="API documentation"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  selection: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  providerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
  },
  infoButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  policyPanel: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  policyCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
  policyLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
});
