import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import {
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
} from '@/components/icons';
import { PROVIDERS } from '@/constants/providers';
import { spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import type { ProviderId } from '@/types/ip';

type ProviderSelectorProps = {
  selectedProvider: ProviderId;
  onSelect: (providerId: ProviderId) => void;
  providerSwitchTarget?: ProviderId | null;
  providerSwitchRefreshing?: boolean;
  providerSwitchRemainingMs?: number;
};

export function ProviderSelector({
  selectedProvider,
  onSelect,
  providerSwitchTarget = null,
  providerSwitchRefreshing = false,
  providerSwitchRemainingMs = 0,
}: ProviderSelectorProps) {
  const colors = useAppColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const selected = PROVIDERS.find(
    (provider) => provider.id === selectedProvider,
  );
  const switchTarget = PROVIDERS.find(
    (provider) => provider.id === providerSwitchTarget,
  );
  const popoverOpen = menuOpen || policiesOpen;
  const popoverTop = switchTarget ? 69 : 50;

  const selectProvider = (providerId: ProviderId) => {
    onSelect(providerId);
    setMenuOpen(false);
  };

  return (
    <View style={[styles.container, { zIndex: popoverOpen ? 20 : 0 }]}>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Provider, ${selected?.name}`}
          accessibilityHint="Opens the provider selector"
          accessibilityState={{ expanded: menuOpen }}
          aria-expanded={menuOpen}
          onPress={() => {
            setPoliciesOpen(false);
            setMenuOpen((visible) => !visible);
          }}
          style={({ pressed }) => [
            styles.trigger,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: menuOpen ? colors.accent : colors.border,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text style={[styles.triggerLabel, { color: colors.textMuted }]}>
            Provider
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.selectedName, { color: colors.text }]}
          >
            {selected?.name}
          </Text>
          <View
            style={{
              transform: [{ rotate: menuOpen ? '180deg' : '0deg' }],
            }}
          >
            <ChevronDownIcon color={colors.accent} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Privacy and terms for ${selected?.name}`}
          accessibilityHint="Shows official third-party policy links"
          accessibilityState={{ expanded: policiesOpen }}
          aria-expanded={policiesOpen}
          onPress={() => {
            setMenuOpen(false);
            setPoliciesOpen((visible) => !visible);
          }}
          hitSlop={4}
          style={({ pressed }) => [
            styles.infoButton,
            {
              backgroundColor: policiesOpen
                ? colors.accentSoft
                : colors.surfaceRaised,
              borderColor: policiesOpen ? colors.accent : colors.border,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <InfoIcon color={colors.accent} size={19} />
        </Pressable>
      </View>

      {switchTarget ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.switchStatus,
            {
              color:
                providerSwitchRefreshing || providerSwitchRemainingMs <= 0
                  ? colors.accent
                  : colors.textMuted,
            },
          ]}
        >
          {providerSwitchRefreshing || providerSwitchRemainingMs <= 0
            ? `Updating with ${switchTarget.name}…`
            : `Updating with ${switchTarget.name} in ${Math.ceil(
                providerSwitchRemainingMs / 1000,
              )}s`}
        </Text>
      ) : null}

      {menuOpen ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Preferred IP information provider"
          onAccessibilityEscape={() => setMenuOpen(false)}
          style={[
            styles.menu,
            {
              top: popoverTop,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              boxShadow: `0 12px 32px ${colors.shadow}`,
            },
          ]}
        >
          {PROVIDERS.map((provider) => {
            const isSelected = provider.id === selectedProvider;

            return (
              <Pressable
                key={provider.id}
                accessibilityRole="radio"
                accessibilityLabel={`Use ${provider.name}`}
                accessibilityHint="Uses this provider for the next lookup"
                accessibilityState={{ checked: isSelected }}
                aria-checked={isSelected}
                onPress={() => selectProvider(provider.id)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor:
                      isSelected || pressed
                        ? colors.accentSoft
                        : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? colors.accent : colors.text },
                  ]}
                >
                  {provider.name}
                </Text>
                <View style={styles.check}>
                  {isSelected ? <CheckIcon color={colors.accent} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {policiesOpen && selected ? (
        <View
          accessibilityLiveRegion="polite"
          onAccessibilityEscape={() => setPoliciesOpen(false)}
          style={[
            styles.policyPopover,
            {
              top: popoverTop,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              boxShadow: `0 12px 32px ${colors.shadow}`,
            },
          ]}
        >
          <Text style={[styles.policyTitle, { color: colors.text }]}>
            {selected.name} privacy
          </Text>
          <Text
            selectable
            style={[styles.policyCopy, { color: colors.textMuted }]}
          >
            For privacy details about this third-party provider, review its
            official Privacy Policy and Terms of Use.
          </Text>
          <View style={styles.policyLinks}>
            <ExternalLink
              compact
              href={selected.privacyUrl}
              label="Privacy Policy"
            />
            <ExternalLink
              compact
              href={selected.termsUrl}
              label="Terms of Use"
            />
            <ExternalLink
              compact
              href={selected.documentationUrl}
              label="API documentation"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minWidth: 240,
    marginLeft: 'auto',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trigger: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 13,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    borderCurve: 'continuous',
  },
  triggerLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    top: 50,
    right: 52,
    width: 188,
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  option: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  check: {
    width: 18,
    height: 18,
  },
  switchStatus: {
    paddingTop: spacing.xs,
    paddingRight: 52,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  policyPopover: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 310,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  policyTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  policyCopy: {
    fontSize: 13,
    lineHeight: 19,
  },
  policyLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
});
