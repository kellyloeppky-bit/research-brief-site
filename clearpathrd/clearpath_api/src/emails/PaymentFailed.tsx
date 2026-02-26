import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface PaymentFailedProps {
  orderId: string;
  productName: string;
  amountDue: number;
  failureReason?: string;
  retryUrl: string;
}

export default function PaymentFailed(props: PaymentFailedProps) {
  return (
    <EmailLayout previewText="Payment failed for your radon test kit order">
      <Text style={styles.heading}>Payment Failed ❌</Text>
      <Text style={styles.text}>
        We were unable to process your payment for your radon test kit order.
        Please try again to complete your purchase.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{props.orderId}</Text>

        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{props.productName}</Text>

        <Text style={styles.label}>Amount Due</Text>
        <Text style={styles.value}>${props.amountDue.toFixed(2)} CAD</Text>

        {props.failureReason && (
          <>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{props.failureReason}</Text>
          </>
        )}
      </Section>

      <Hr />

      <Section
        style={{
          backgroundColor: '#fef2f2',
          padding: '20px',
          borderRadius: '6px',
          margin: '20px 0',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            color: '#dc2626',
            fontWeight: '600',
            margin: '0 0 10px 0',
          }}
        >
          💡 Common Issues
        </Text>
        <Text style={{ fontSize: '14px', color: '#333', margin: '0' }}>
          • Insufficient funds
          <br />
          • Incorrect card details
          <br />
          • Card expired
          <br />• Bank declined the transaction
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.retryUrl}>Retry Payment</Button>
      </Section>

      <Text style={styles.text}>
        If you continue to experience issues, please contact your bank or reach
        out to our support team for assistance.
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
