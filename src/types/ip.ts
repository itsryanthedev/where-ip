export type ProviderId = 'ipinfo' | 'freeipapi' | 'ipwhois';

export type IpVersion = 4 | 6;

export type IpResult = {
  ip: string;
  ipVersion: IpVersion;
  countryCode: string;
  countryName?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  organization?: string;
  isp?: string;
  providerId: ProviderId;
  fetchedAt: string;
};

export type ProviderCooldowns = Partial<Record<ProviderId, number>>;

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  shortDescription: string;
  endpoint: string;
  documentationUrl: string;
  privacyUrl: string;
  termsUrl: string;
};

export type LookupOutcome = {
  result: IpResult;
  attemptedProviders: ProviderId[];
  providerCooldowns: ProviderCooldowns;
};

