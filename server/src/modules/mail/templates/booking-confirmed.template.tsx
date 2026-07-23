import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from './email-layout.js';
import { emailStyles as s } from './email-theme.js';

export interface BookingConfirmedTemplateProps {
  clientName: string;
  petName: string;
  serviceName: string;
  staffName: string;
  startsAtLocal: string;
  priceThb: string;
  bookingsUrl: string;
}

/** Booking confirmation — the details card mirrors the wizard's confirm step. */
export function BookingConfirmedTemplate ( {
  clientName,
  petName,
  serviceName,
  staffName,
  startsAtLocal,
  priceThb,
  bookingsUrl,
}: BookingConfirmedTemplateProps ) {
  return (
    <EmailLayout preview={ `Booking confirmed — ${ serviceName } for ${ petName }` }>
      <Heading style={ s.heading }>Booking confirmed 🎉</Heading>

      <Text style={ s.text }>Hi { clientName },</Text>
      <Text style={ s.text }>Your appointment is booked. Here are the details:</Text>

      <Section style={ s.detailCard }>
        <Text style={ s.detailRow }>
          <span style={ s.detailLabel }>Service:</span> <strong>{ serviceName }</strong>
        </Text>
        <Text style={ s.detailRow }>
          <span style={ s.detailLabel }>Pet:</span> <strong>{ petName }</strong>
        </Text>
        <Text style={ s.detailRow }>
          <span style={ s.detailLabel }>Groomer:</span> <strong>{ staffName }</strong>
        </Text>
        <Text style={ s.detailRow }>
          <span style={ s.detailLabel }>When:</span> <strong>{ startsAtLocal }</strong>
        </Text>
        <Text style={ s.detailRow }>
          <span style={ s.detailLabel }>Price:</span> <strong>฿{ priceThb }</strong> (pay at the shop)
        </Text>
      </Section>

      <Section style={ s.buttonSection }>
        <Button href={ bookingsUrl } style={ s.button }>
          View my bookings
        </Button>
      </Section>

      <Text style={ s.secondaryText }>Need to change plans? You can cancel from “My Bookings” up until the cancellation cutoff.</Text>
      <Text style={ s.secondaryText }>See you soon! 🐾</Text>
    </EmailLayout>
  );
}

BookingConfirmedTemplate.PreviewProps = {
  clientName: 'William',
  petName: 'Latte',
  serviceName: 'Full Groom',
  staffName: 'Cee',
  startsAtLocal: 'Fri, 24 Jul 2026 · 10:00',
  priceThb: '690',
  bookingsUrl: 'http://localhost:3000/bookings',
} satisfies BookingConfirmedTemplateProps;

export default BookingConfirmedTemplate;
