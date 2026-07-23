import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type * as React from 'react';
import { emailStyles as s } from './email-theme.js';

/**
 * Shared frame for every transactional email: logo header, content slot,
 * divider, and footer. Templates only provide their preview line + body.
 */
export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.logoSection}>
            <Text style={s.logo}>🐾 Pet Grooming</Text>
          </Section>

          {children}

          <Hr style={s.divider} />
          <Text style={s.footer}>Thai hospitality &amp; modern pet wellness · Chiang Mai</Text>
          <Text style={s.footer}>© {new Date().getFullYear()} Pet Grooming</Text>
        </Container>
      </Body>
    </Html>
  );
}
