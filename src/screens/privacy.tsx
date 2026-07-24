import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { APP_LINKS } from '@/constants/links';
import { PROVIDERS } from '@/constants/providers';
import { radii, shadows, spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';

export function Privacy() {
  const colors = useAppColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.background }}
      >
        <View style={styles.content}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            WhereIP Privacy Policy
          </Text>
          <Text style={[styles.effectiveDate, { color: colors.textMuted }]}>
            Effective July 24, 2026
          </Text>

          <PolicySection featured title="The short version">
            WhereIP does not operate a backend, create accounts, show ads, run
            analytics, track you, or request GPS access. The app asks a
            third-party IP information provider for your public network
            information and displays the response on your device.
          </PolicySection>

          <PolicySection title="Information processed">
            To answer a lookup, the selected provider receives the public IP
            address from which your request originates. Its response may include
            that IP, approximate city or region, country, timezone, and network
            organization. IP-based location is approximate and is not GPS
            location.
          </PolicySection>

          <PolicySection title="Third-party providers">
            IPinfo is the default. If it cannot return a usable result, WhereIP
            may contact FreeIPAPI and then ipwho.is. You may select another
            preferred provider. Each service operates independently and applies
            its own privacy policy and terms.
          </PolicySection>

          <View style={styles.providerPolicies}>
            {PROVIDERS.map((provider) => (
              <View
                key={provider.id}
                style={[
                  styles.providerPolicy,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    boxShadow: `${shadows.control} ${colors.shadow}`,
                  },
                ]}
              >
                <Text style={[styles.providerName, { color: colors.text }]}>
                  {provider.name}
                </Text>
                <View style={styles.providerLinks}>
                  <ExternalLink
                    compact
                    href={provider.privacyUrl}
                    label="Privacy Policy"
                  />
                  <ExternalLink
                    compact
                    href={provider.termsUrl}
                    label="Terms of Use"
                  />
                </View>
              </View>
            ))}
          </View>

          <PolicySection title="Data stored on your device">
            WhereIP stores your acknowledgement of the first-run disclosure,
            preferred provider, temporary provider cool-off times, and the most
            recent successful result. This local cache prevents unnecessary
            requests and supports a useful offline state. WhereIP does not sync
            this data to a developer-controlled service.
          </PolicySection>

          <PolicySection title="Permissions and diagnostics">
            The app requests no location, contacts, camera, microphone, tracking,
            or advertising permission. Production builds contain no analytics or
            advertising SDK. If you report a problem, you decide what information
            to include in the public GitHub issue.
          </PolicySection>

          <PolicySection title="Children">
            WhereIP is a general-purpose network utility. It does not knowingly
            collect personal information from children or from any other user.
          </PolicySection>

          <PolicySection title="Changes">
            Material changes to this policy will be published with the source
            code and reflected in a new effective date. Provider policies can
            change independently; their official links above are authoritative.
          </PolicySection>

          <PolicySection title="Contact">
            Questions, corrections, and security reports can be submitted through
            the project’s public issue tracker. Do not include private network
            details in a public report.
          </PolicySection>

          <ExternalLink href={APP_LINKS.issues} label="Open the issue tracker" />
          <ExternalLink href={APP_LINKS.repository} label="Inspect the source code" />
        </View>
      </ScrollView>
    </>
  );
}

function PolicySection({
  title,
  children,
  featured = false,
}: {
  title: string;
  children: React.ReactNode;
  featured?: boolean;
}) {
  const colors = useAppColors();
  return (
    <View
      style={[
        styles.section,
        featured && styles.featuredSection,
        featured && {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: `${shadows.card} ${colors.shadow}`,
        },
      ]}
    >
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
        {title}
      </Text>
      <Text selectable style={[styles.body, { color: colors.textMuted }]}>
        {children}
      </Text>
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
    maxWidth: 760,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  effectiveDate: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  featuredSection: {
    borderWidth: 1,
    borderRadius: radii.section,
    borderCurve: 'continuous',
    padding: spacing.xl,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
  providerPolicies: {
    gap: spacing.md,
  },
  providerPolicy: {
    borderWidth: 1,
    borderRadius: radii.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  providerName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  providerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
});
