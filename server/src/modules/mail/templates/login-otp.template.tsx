import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from './email-layout.js';
import { emailStyles as s } from './email-theme.js';

export interface LoginOtpTemplateProps {
  name: string;
  code: string;
  expiresInMinutes: number;
}

/** Login 2FA code. The big centered code mirrors the "spa lagoon" chips. */
export function LoginOtpTemplate({ name, code, expiresInMinutes }: LoginOtpTemplateProps) {
  return (
    <EmailLayout preview={`Your Pet Grooming login code: ${code}`}>
      <Heading style={s.heading}>Your login code</Heading>
      <Text style={s.text}>Hi {name},</Text>
      <Text style={s.text}>Enter this code to finish signing in:</Text>

      <Section style={{ ...s.detailCard, textAlign: 'center' }}>
        <Text style={otpCode}>{code}</Text>
      </Section>

      <Text style={s.secondaryText}>This code expires in {expiresInMinutes} minutes.</Text>
      <Text style={s.secondaryText}>If you did not try to sign in, you can ignore this email and your password stays safe.</Text>
    </EmailLayout>
  );
}

LoginOtpTemplate.PreviewProps = {
  name: 'William',
  code: '042317',
  expiresInMinutes: 10,
} satisfies LoginOtpTemplateProps;

const otpCode: React.CSSProperties = {
  color: '#006b5f',
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontSize: '34px',
  fontWeight: 700,
  letterSpacing: '10px',
  margin: 0,
  paddingLeft: '10px',
};

export default LoginOtpTemplate;
