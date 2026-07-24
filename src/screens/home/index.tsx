import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Link, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppLogo } from '@/components/app-logo';
import { DetailCard } from '@/components/detail-card';
import { CopyIcon, InfoIcon } from '@/components/icons';
import { ProviderSelector } from '@/components/provider-selector';
import { RefreshCountdown } from '@/components/refresh-countdown';
import { RevealView } from '@/components/reveal-view';
import { TactilePressable } from '@/components/tactile-pressable';
import { getProvider } from '@/constants/providers';
import {
  contentMaxWidth,
  motion,
  radii,
  shadows,
  spacing,
} from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { useCooldownRemainingMs } from '@/hooks/use-cooldown-remaining-ms';
import { useWhereIp } from '@/providers/where-ip-provider';
import type { ProviderId } from '@/types/ip';
import {
  countryCodeToFlag,
  formatLocation,
  formatLookupTime,
} from '@/utils/ip';

function HomeHeaderAboutButton() {
  const colors = useAppColors();

  return (
    <Link href="/about" asChild>
      <TactilePressable
        accessibilityRole="button"
        accessibilityLabel="About and privacy"
        style={({ pressed }) => [
          styles.headerButton,
          {
            backgroundColor: pressed
              ? colors.accentSoft
              : 'transparent',
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <InfoIcon color={colors.accent} size={25} />
      </TactilePressable>
    </Link>
  );
}

export function Home() {
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const {
    isReady,
    result,
    status,
    errorMessage,
    fallbackFrom,
    preferredProvider,
    setPreferredProvider,
    providerSwitchTarget,
    providerSwitchRefreshing,
    refresh,
  } = useWhereIp();
  const cooldownRemainingMs = useCooldownRemainingMs(result?.fetchedAt);
  const providerSwitchRemainingMs = providerSwitchTarget
    ? cooldownRemainingMs
    : 0;
  const [copied, setCopied] = useState(false);
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isCompact = width < 620;
  const isLoading = status === 'loading' || status === 'refreshing';
  const provider = result ? getProvider(result.providerId) : null;

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current) {
        clearTimeout(copiedResetTimerRef.current);
      }
    };
  }, []);

  const copyIp = async () => {
    if (!result) {
      return;
    }
    await Clipboard.setStringAsync(result.ip);
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopied(true);
    if (copiedResetTimerRef.current) {
      clearTimeout(copiedResetTimerRef.current);
    }
    copiedResetTimerRef.current = setTimeout(() => {
      setCopied(false);
      copiedResetTimerRef.current = null;
    }, 1800);
  };

  const shareResult = async () => {
    if (!result) {
      return;
    }
    const location = formatLocation(result.city, result.region, result.countryName);
    await Share.share({
      message: `Public IP: ${result.ip}\nApproximate location: ${location}\nChecked with WhereIP.`,
    });
  };

  const selectProvider = async (providerId: ProviderId) => {
    if (providerId === preferredProvider) {
      return;
    }

    await setPreferredProvider(providerId);
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.selectionAsync();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'WhereIP',
          headerRight: () => <HomeHeaderAboutButton />,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isCompact ? spacing.lg : spacing.xl },
        ]}
        style={{ backgroundColor: colors.background }}
      >
        <View
          style={[
            styles.backgroundOrb,
            {
              backgroundColor: colors.backgroundAccent,
              borderColor: colors.accentSoft,
            },
          ]}
        />
        <View style={styles.content}>
          <View style={styles.hero}>
            <AppLogo size={isCompact ? 78 : 92} />
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>
                YOUR PUBLIC CONNECTION
              </Text>
              <Text
                accessibilityRole="header"
                style={[
                  styles.heroTitle,
                  {
                    color: colors.text,
                    fontSize: isCompact ? 30 : 38,
                    letterSpacing: isCompact ? -0.7 : -1.1,
                    lineHeight: isCompact ? 36 : 44,
                  },
                ]}
              >
                Know what the internet sees.
              </Text>
              <Text style={[styles.heroDescription, { color: colors.textMuted }]}>
                One clear, privacy-first view of your public IP and approximate
                network location.
              </Text>
            </View>
          </View>

          {!isReady || (status === 'loading' && !result) ? (
            <View
              accessible
              accessibilityLiveRegion="polite"
              style={[
                styles.loadingCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  boxShadow: `${shadows.card} ${colors.shadow}`,
                },
              ]}
            >
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={[styles.loadingTitle, { color: colors.text }]}>
                Checking your public connection…
              </Text>
              <Text style={[styles.loadingDescription, { color: colors.textMuted }]}>
                IPinfo is tried first. A fallback is used only if needed.
              </Text>
            </View>
          ) : result ? (
            <>
              <RevealView
                duration={motion.duration.content}
                fromTranslateY={motion.offset.content}
                style={[
                  styles.ipCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    boxShadow: `${shadows.hero} ${colors.shadow}`,
                  },
                ]}
              >
                <View style={styles.ipTopRow}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          status === 'success' ? colors.mintSoft : colors.warningSoft,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            status === 'success' ? colors.mint : colors.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            status === 'success' ? colors.mint : colors.warning,
                        },
                      ]}
                    >
                      {status === 'success' ? 'Current' : 'Cached result'}
                    </Text>
                  </View>
                  <Text style={styles.flag} accessibilityLabel={result.countryCode}>
                    {countryCodeToFlag(result.countryCode)}
                  </Text>
                </View>

                <Text style={[styles.ipLabel, { color: colors.textMuted }]}>
                  PUBLIC IP ADDRESS
                </Text>
                <Text
                  selectable
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  numberOfLines={1}
                  style={[
                    styles.ipAddress,
                    {
                      color: colors.text,
                      fontSize: isCompact ? 29 : 42,
                      lineHeight: isCompact ? 38 : 52,
                    },
                  ]}
                >
                  {result.ip}
                </Text>

                <View style={styles.ipActions}>
                  <ActionButton
                    icon={<CopyIcon color="#FFFFFF" />}
                    label={copied ? 'Copied' : 'Copy IP'}
                    onPress={() => void copyIp()}
                    style={styles.ipAction}
                  />
                  <ActionButton
                    label="Share"
                    onPress={() => void shareResult()}
                    style={styles.ipAction}
                    variant="secondary"
                  />
                </View>

                <View
                  style={[
                    styles.providerLine,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.providerText, { color: colors.textMuted }]}>
                    Checked {formatLookupTime(result.fetchedAt)} via{' '}
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {provider?.name}
                    </Text>
                  </Text>
                  <ProviderSelector
                    selectedProvider={preferredProvider}
                    onSelect={(providerId) => void selectProvider(providerId)}
                    providerSwitchTarget={providerSwitchTarget}
                    providerSwitchRefreshing={providerSwitchRefreshing}
                    providerSwitchRemainingMs={providerSwitchRemainingMs}
                  />
                </View>
              </RevealView>

              {fallbackFrom ? (
                <RevealView
                  accessibilityLiveRegion="polite"
                  duration={motion.duration.popover}
                  fromTranslateY={motion.offset.popover}
                  style={[
                    styles.notice,
                    {
                      backgroundColor: colors.warningSoft,
                      borderColor: colors.warning,
                    },
                  ]}
                >
                  <Text style={[styles.noticeText, { color: colors.warning }]}>
                    {getProvider(fallbackFrom).name} was unavailable, so{' '}
                    {provider?.name} supplied this result.
                  </Text>
                </RevealView>
              ) : null}

              {errorMessage ? (
                <RevealView
                  accessibilityLiveRegion="assertive"
                  duration={motion.duration.popover}
                  fromTranslateY={motion.offset.popover}
                  style={[
                    styles.notice,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderColor: colors.danger,
                    },
                  ]}
                >
                  <Text selectable style={[styles.noticeText, { color: colors.danger }]}>
                    {errorMessage}
                  </Text>
                </RevealView>
              ) : null}

              <RevealView
                delay={40}
                duration={motion.duration.content}
                fromTranslateY={motion.offset.content}
                style={styles.detailGrid}
              >
                <DetailCard
                  label="Approximate location"
                  supportingText="Estimated from your public IP — never GPS."
                  value={formatLocation(
                    result.city,
                    result.region,
                    result.countryName ?? result.countryCode,
                  )}
                />
                <DetailCard
                  label="Network"
                  supportingText={result.asn ?? 'ASN unavailable'}
                  value={result.organization ?? result.isp ?? 'Unavailable'}
                />
                <DetailCard
                  label="Connection"
                  supportingText="Observed by the lookup provider"
                  value={`IPv${result.ipVersion}`}
                />
                <DetailCard
                  label="Timezone"
                  supportingText={result.postalCode ? `Postal area ${result.postalCode}` : undefined}
                  value={result.timezone ?? 'Unavailable'}
                />
                <DetailCard
                  label="DNS resolver"
                  supportingText="Apps and browsers cannot reliably read your configured DNS resolver."
                  value="Unavailable"
                />
                <DetailCard
                  label="Coordinates"
                  supportingText="Approximate IP geolocation"
                  value={
                    result.latitude !== undefined && result.longitude !== undefined
                      ? `${result.latitude.toFixed(3)}, ${result.longitude.toFixed(3)}`
                      : 'Unavailable'
                  }
                />
              </RevealView>

              <RevealView
                delay={80}
                duration={motion.duration.content}
                fromTranslateY={motion.offset.content}
                style={[
                  styles.refreshCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    boxShadow: `${shadows.card} ${colors.shadow}`,
                  },
                ]}
              >
                <RefreshCountdown
                  cooldownRemainingMs={cooldownRemainingMs}
                  loading={isLoading}
                  onRefresh={() => void refresh()}
                />
              </RevealView>
            </>
          ) : (
            <View
              style={[
                styles.loadingCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.loadingTitle, { color: colors.text }]}>
                We couldn’t check your connection
              </Text>
              <Text selectable style={[styles.loadingDescription, { color: colors.textMuted }]}>
                {errorMessage ?? 'Check your internet connection and try again.'}
              </Text>
              <ActionButton
                label="Try again"
                loading={isLoading}
                onPress={() => void refresh()}
              />
            </View>
          )}

          <Text style={[styles.footer, { color: colors.textMuted }]}>
            No account · No ads · No analytics · Open source
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  scrollContent: {
    minHeight: '100%',
    paddingTop: spacing.xl,
    paddingBottom: spacing.hero,
    overflow: 'hidden',
  },
  backgroundOrb: {
    pointerEvents: 'none',
    position: 'absolute',
    top: -180,
    right: -160,
    width: 480,
    height: 480,
    borderRadius: 240,
    borderWidth: 42,
    opacity: 0.8,
  },
  content: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  heroCopy: {
    flex: 1,
    minWidth: 240,
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    fontWeight: '800',
  },
  heroDescription: {
    maxWidth: 620,
    fontSize: 17,
    lineHeight: 25,
  },
  loadingCard: {
    minHeight: 300,
    borderWidth: 1,
    borderRadius: radii.section,
    borderCurve: 'continuous',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingDescription: {
    maxWidth: 500,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  ipCard: {
    zIndex: 1,
    borderWidth: 1,
    borderRadius: radii.hero,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.md,
  },
  ipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  flag: {
    fontSize: 34,
    lineHeight: 42,
  },
  ipLabel: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ipAddress: {
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  ipActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  ipAction: {
    minWidth: 136,
  },
  providerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
  },
  providerText: {
    minWidth: 210,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  notice: {
    borderWidth: 1,
    borderRadius: radii.control,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  refreshCard: {
    borderWidth: 1,
    borderRadius: radii.section,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
