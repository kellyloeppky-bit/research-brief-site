import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';

export interface RefundProcessedProps {
  orderId: string;
  refundAmount: number;
  refundReason: string;
  refundDate: Date;
  estimatedArrival: string;
}

export default function RefundProcessed(props: RefundProcessedProps) {
  return (
    <EmailLayout previewText="Refund processed for your order">
      <Text style={styles.heading}>Refund Processed 💰</Text>
      <Text style={styles.text}>
        Your refund has been processed successfully. The funds should appear in
        your original payment method within {props.estimatedArrival}.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{props.orderId}</Text>

        <Text style={styles.label}>Refund Amount</Text>
        <Text style={styles.value}>${props.refundAmount.toFixed(2)} CAD</Text>

        <Text style={styles.label}>Reason</Text>
        <Text style={styles.value}>{props.refundReason}</Text>

        <Text style={styles.label}>Refund Date</Text>
        <Text style={styles.value}>
          {props.refundDate.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Text style={styles.label}>Estimated Arrival</Text>
        <Text style={styles.value}>{props.estimatedArrival}</Text>
      </Section>

      <Hr />

      <Section
        style={{
          backgroundColor: '#f0f7ff',
          padding: '20px',
          borderRadius: '6px',
          margin: '20px 0',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            color: '#1a73e8',
            fontWeight: '600',
            margin: '0 0 10px 0',
          }}
        >
          ℹ️ What Happens Next?
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: '#333',
            margin: '0',
            lineHeight: '20px',
          }}
        >
          The refund will appear as a credit on your card statement. Depending
          on your bank, it may take {props.estimatedArrival} to process.
        </Text>
      </Section>

      <Text style={styles.text}>
        If you don't see the refund after {props.estimatedArrival}, please
        contact your bank or reach out to our support team.
      </Text>
    </EmailLayout>
  );
}

const styles = {
  heading: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 20px 0' },
  text: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#333',
    margin: '15px 0',
  },
  label: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    margin: '15px 0 5px 0',
  },
  value: { fontSize: '16px', color: '#333', margin: '0 0 10px 0' },
};
