'use strict';

/** @typedef {string} DesktopLinkId */

/** @type {Readonly<Record<DesktopLinkId, string>>} */
const ALLOWED_LINKS = Object.freeze({
  'app.repository': 'https://github.com/itsryanthedev/where-ip',
  'app.license':
    'https://github.com/itsryanthedev/where-ip/blob/main/LICENSE',
  'app.notice':
    'https://github.com/itsryanthedev/where-ip/blob/main/NOTICE',
  'app.issues': 'https://github.com/itsryanthedev/where-ip/issues',
  'app.creator': 'https://github.com/itsryanthedev',
  'app.openSourceProjects':
    'https://github.com/itsryanthedev?tab=repositories',
  'provider.ipinfo.privacy': 'https://ipinfo.io/privacy-policy',
  'provider.ipinfo.terms': 'https://ipinfo.io/terms-of-service',
  'provider.ipinfo.documentation':
    'https://support.ipinfo.io/hc/en-us/articles/30792479436562-What-Is-the-Difference-Between-Using-the-Authenticated-Free-Plan-and-the-Public-API-With-No-Account',
  'provider.freeipapi.privacy': 'https://freeipapi.com/privacy',
  'provider.freeipapi.terms': 'https://freeipapi.com/terms',
  'provider.freeipapi.documentation':
    'https://freeipapi.com/docs/api-reference/api-introduction',
  'provider.ipwhois.privacy': 'https://ipwhois.io/privacy',
  'provider.ipwhois.terms': 'https://ipwhois.io/terms',
  'provider.ipwhois.documentation': 'https://ipwhois.io/documentation',
});

/**
 * @param {unknown} linkId
 * @returns {string}
 */
function resolveAllowedLink(linkId) {
  if (typeof linkId !== 'string' || !Object.hasOwn(ALLOWED_LINKS, linkId)) {
    throw new Error('External link is not allowlisted');
  }
  const url = ALLOWED_LINKS[linkId];
  if (!url.startsWith('https://')) {
    throw new Error('External link must use HTTPS');
  }
  return url;
}

/**
 * @param {unknown} linkId
 * @returns {linkId is DesktopLinkId}
 */
function isDesktopLinkId(linkId) {
  return typeof linkId === 'string' && Object.hasOwn(ALLOWED_LINKS, linkId);
}

module.exports = {
  ALLOWED_LINKS,
  resolveAllowedLink,
  isDesktopLinkId,
};
