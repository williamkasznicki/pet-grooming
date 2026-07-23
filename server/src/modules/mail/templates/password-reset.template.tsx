import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from './email-layout.js';
import { emailStyles as s } from './email-theme.js';

export interface PasswordResetTemplateProps {
  name: string;
  code: string;
  expiresInMinutes: number;
}

/** Password reset code. Same code presentation as the login OTP. */
export function PasswordResetTemplate({ name, code, expiresInMinutes }: PasswordResetTemplateProps) {
  return (
    <EmailLayout preview={`Your Pet Grooming password reset code: ${code}`}>
      <Heading style={s.heading}>Reset your password</Heading>
      <Text style={s.text}>Hi {name},</Text>
      <Text style={s.text}>Use this code to set a new password:</Text>

      <Section style={{ ...s.detailCard, textAlign: 'center' }}>
        <Text style={otpCode}>{code}</Text>
      </Section>

      <Text style={s.secondaryText}>This code expires in {expiresInMinutes} minutes.</Text>
      <Text style={s.secondaryText}>
        If you did not ask to reset your password, ignore this email — nothing changes until the code is used.
      </Text>
    </EmailLayout>
  );
}

PasswordResetTemplate.PreviewProps = {
  name: 'William',
  code: '042317',
  expiresInMinutes: 10,
} satisfies PasswordResetTemplateProps;

const otpCode: React.CSSProperties = {
  color: '#006b5f',
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontSize: '34px',
  fontWeight: 700,
  letterSpacing: '10px',
  margin: 0,
  paddingLeft: '10px',
};

export default PasswordResetTemplate;
