/**
 * Privacy and PII scrubbing module (PDF §3, §11, Rule C2).
 * Removes personal email addresses, phone numbers, and individual profile links.
 * Preserves authorized generic corporate mailboxes.
 */

const ALLOWED_ROLE_MAILBOX_PREFIXES = [
  'info',
  'contact',
  'sales',
  'hello',
  'enquiries',
  'support',
  'tenders',
  'partner',
  'partnerships',
];

export function isGenericRoleMailbox(email: string): boolean {
  const lower = email.toLowerCase().trim();
  const prefix = lower.split('@')[0];
  return ALLOWED_ROLE_MAILBOX_PREFIXES.includes(prefix);
}

export function scrubPii(text: string): string {
  if (!text) return '';

  let scrubbed = text;

  // 1. Scrub emails unless they match the approved generic role mailbox prefixes
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  scrubbed = scrubbed.replace(emailRegex, (match) => {
    if (isGenericRoleMailbox(match)) {
      return match;
    }
    return '[email-scrubbed]';
  });

  // 2. Scrub international and local phone numbers
  // Matches patterns like +1 (555) 123-4567, +44 20 7946 0958, 0800 123 4567, etc.
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
  scrubbed = scrubbed.replace(phoneRegex, (match) => {
    // Avoid scrubbing simple 4-digit years like 2026 or small numbers
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return '[phone-scrubbed]';
    }
    return match;
  });

  // 3. Scrub personal profile URLs
  const personalProfileRegex = /https?:\/\/(?:www\.)?(?:linkedin\.com\/in\/|twitter\.com\/|x\.com\/|instagram\.com\/)[A-Za-z0-9_.-]+/gi;
  scrubbed = scrubbed.replace(personalProfileRegex, '[profile-scrubbed]');

  return scrubbed;
}
