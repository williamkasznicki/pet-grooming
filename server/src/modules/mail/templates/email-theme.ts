import type * as React from 'react';

/**
 * Shared inline styles for all transactional emails — the "spa lagoon" design
 * system (docs/DESIGN.md) translated to email-safe CSS: lagoon #14b8a6 CTAs,
 * navy ink #0b1c30 text, cool blue-white canvas. Every template composes from
 * these so the whole mailbox reads as one brand.
 */
export const emailStyles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: '#f8f9ff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Anuphan, sans-serif',
    margin: 0,
    padding: '40px 12px',
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #dce4f2',
    borderRadius: '16px',
    margin: '0 auto',
    maxWidth: '560px',
    padding: '36px',
  },
  logoSection: {
    marginBottom: '24px',
    textAlign: 'center',
  },
  logo: {
    color: '#006b5f',
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  heading: {
    color: '#0b1c30',
    fontSize: '26px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: '34px',
    margin: '0 0 24px',
    textAlign: 'center',
  },
  text: {
    color: '#33415c',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 16px',
  },
  detailCard: {
    backgroundColor: '#eff4ff',
    borderRadius: '12px',
    margin: '24px 0',
    padding: '20px 24px',
  },
  detailRow: {
    color: '#33415c',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '4px 0',
  },
  detailLabel: {
    color: '#565e74',
  },
  buttonSection: {
    margin: '32px 0',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#14b8a6',
    borderRadius: '9999px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 600,
    padding: '14px 28px',
    textDecoration: 'none',
  },
  secondaryText: {
    color: '#6c7a95',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '12px 0',
  },
  link: {
    color: '#006b5f',
    fontSize: '13px',
    lineHeight: '20px',
    wordBreak: 'break-all',
  },
  divider: {
    borderColor: '#e5ecf9',
    margin: '32px 0 20px',
  },
  footer: {
    color: '#93a1bb',
    fontSize: '12px',
    lineHeight: '18px',
    margin: '8px 0',
    textAlign: 'center',
  },
};
