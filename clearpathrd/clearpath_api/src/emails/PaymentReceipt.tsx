import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface PaymentReceiptProps {
  orderId: string;
  productName: string;
  amountPaid: number;
  paidAt: Date;
  receiptUrl: string;
}

export default function PaymentReceipt(props: PaymentReceiptProps) {
  return (
    <EmailLayout previewText="Payment receipt for your radon test kit order">
      <Text style={styles.heading}>Payment Received ✅</Text>
      <Text style={styles.text}>
        Thank you! Your payment has been processed successfully. Your radon
        test kit will be shipped soon.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{props.orderId}</Text>

        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{props.productName}</Text>

        <Text style={styles.label}>Amount Paid</Text>
        <Text style={styles.value}>${props.amountPaid.toFixed(2)} CAD</Text>

        <Text style={styles.label}>Payment Date</Text>
        <Text style={styles.value}>
          {props.paidAt.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </Section>

      <Hr />

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.receiptUrl}>View Receipt</Button>
      </Section>

      <Text style={styles.text}>
        Keep this email for your records. If you have any questions about your
        payment, please don't hesitate to contact us.
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
