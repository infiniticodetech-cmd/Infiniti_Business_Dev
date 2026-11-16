import { describe, it, expect } from 'vitest';
import { scrubPii, isGenericRoleMailbox } from '../lib/pipeline/scrub';

describe('Privacy & PII Scrubbing (D2-PIPE-06, Rule C2)', () => {
  it('identifies authorized generic corporate role mailboxes', () => {
    expect(isGenericRoleMailbox('info@example.com')).toBe(true);
    expect(isGenericRoleMailbox('contact@company.org')).toBe(true);
    expect(isGenericRoleMailbox('sales@acme.com')).toBe(true);
    expect(isGenericRoleMailbox('hello@startup.io')).toBe(true);
    expect(isGenericRoleMailbox('tenders@gov.uk')).toBe(true);
    expect(isGenericRoleMailbox('john.doe@example.com')).toBe(false);
  });

  it('scrubs personal emails while preserving corporate role mailboxes', () => {
    const input = 'Contact project manager john.smith.2024@gmail.com or send formal proposals to tenders@company.com';
    const output = scrubPii(input);
    expect(output).toContain('[email-scrubbed]');
    expect(output).toContain('tenders@company.com');
    expect(output).not.toContain('john.smith.2024@gmail.com');
  });

  it('scrubs international phone numbers', () => {
    const input = 'Call our direct line +1 (555) 234-5678 or UK office +44 20 7946 0958 for details.';
    const output = scrubPii(input);
    expect(output).toContain('[phone-scrubbed]');
    expect(output).not.toContain('555');
  });

  it('scrubs personal profile URLs', () => {
    const input = 'Lead engineer profile at https://linkedin.com/in/johndoedev and https://x.com/johndoe';
    const output = scrubPii(input);
    expect(output).toContain('[profile-scrubbed]');
    expect(output).not.toContain('johndoedev');
  });
});
