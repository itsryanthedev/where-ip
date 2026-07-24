import Constants from 'expo-constants';
import { Link, Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLogo } from '@/components/app-logo';
import { ExternalLink } from '@/components/external-link';
import { ProviderCard } from '@/components/provider-card';
import { TactilePressable } from '@/components/tactile-pressable';
import { APP_LINKS } from '@/constants/links';
import { PROVIDERS } from '@/constants/providers';
import {
  contentMaxWidth,
  radii,
  shadows,
  spacing,
} from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { useWhereIp } from '@/providers/where-ip-provider';

export function About() {
  const colors = useAppColors();
  const { preferredProvider, setPreferredProvider } = useWhereIp();

  return (
    <>
      <Stack.Screen options={{ title: 'About & Privacy' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.background }}
      >
        <View style={styles.content}>
          <View style={styles.intro}>
            <AppLogo size={72} />
            <View style={styles.introCopy}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.text }]}
              >
                Simple by design.
              </Text>
              <Text selectable style={[styles.body, { color: colors.textMuted }]}>
                WhereIP is a free and open-source utility with no account, ads,
                analytics, GPS access, or developer-operated backend.
              </Text>
            </View>
          </View>

          <Section title="How your lookup works">
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              Your device contacts the selected provider directly. That provider
              necessarily sees your public IP address and processes the request
              under its own policies. WhereIP does not receive your lookup and
              stores only a short-lived cache on this device.
            </Text>
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              If the selected provider fails, the app may try each other provider
              once. Changing providers schedules one lookup as soon as the global
              refresh cooldown allows; it never bypasses the cooldown or starts
              continuous polling.
            </Text>
            <Link href="/privacy" asChild>
              <TactilePressable
                accessibilityRole="link"
                style={({ pressed }) => [
                  styles.inlineRouteLink,
                  {
                    backgroundColor: pressed
                      ? colors.backgroundAccent
                      : colors.surfaceRaised,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={[styles.inlineRouteLabel, { color: colors.accent }]}>
                  Read the complete WhereIP privacy policy
                </Text>
              </TactilePressable>
            </Link>
          </Section>

          <Section title="Choose your provider">
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              IPinfo is the default. Your preference stays on this device. Use
              each provider’s information control to inspect its official
              Privacy Policy and Terms of Use.
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="IP information provider"
              style={styles.providerList}
            >
              {PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  selected={preferredProvider === provider.id}
                  onSelect={() => void setPreferredProvider(provider.id)}
                />
              ))}
            </View>
          </Section>

          <Section title="Open source">
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              The source code and documentation are published under the Apache
              License 2.0. Official brand assets are reserved, so modified apps
              must use their own name and visual identity.
            </Text>
            <View style={styles.linkList}>
              <ExternalLink href={APP_LINKS.repository} label="WhereIP source code" />
              <ExternalLink href={APP_LINKS.license} label="Apache 2.0 license" />
              <ExternalLink href={APP_LINKS.notice} label="Attribution notice" />
              <ExternalLink href={APP_LINKS.issues} label="Report an issue" />
            </View>
          </Section>

          <Section title="Made by Ryan the Dev">
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              Explore more intentionally public open-source and independent
              projects. Private repositories and private client work are never
              exposed here.
            </Text>
            <View style={styles.linkList}>
              <ExternalLink href={APP_LINKS.creator} label="Ryan the Dev on GitHub" />
              <ExternalLink
                href={APP_LINKS.openSourceProjects}
                label="Open-source projects"
              />
            </View>
          </Section>

          <Text style={[styles.version, { color: colors.textMuted }]}>
            WhereIP {Constants.expoConfig?.version ?? '1.0.1'} · Apache-2.0
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: `${shadows.card} ${colors.shadow}`,
        },
      ]}
    >
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    minHeight: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(contentMaxWidth, 760),
    alignSelf: 'center',
    gap: spacing.lg,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  introCopy: {
    flex: 1,
    minWidth: 230,
    gap: spacing.sm,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  section: {
    borderWidth: 1,
    borderRadius: radii.section,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
  },
  inlineRouteLink: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  inlineRouteLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  providerList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  linkList: {
    alignItems: 'flex-start',
  },
  version: {
    paddingVertical: spacing.lg,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
