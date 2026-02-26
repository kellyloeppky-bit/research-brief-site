import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface KitOrderConfirmationProps {
  orderId: string;
  productName: string;
  quantity: number;
  totalCad: number;
  shippingAddress: string;
  trackOrderUrl: string;
}

export default function KitOrderConfirmation(
  props: KitOrderConfirmationProps
) {
  return (
    <EmailLayout previewText="Your radon test kit order has been confirmed">
      <Text style={styles.heading}>Order Confirmed! 🎉</Text>
      <Text style={styles.text}>
        Thank you for ordering your radon test kit from ClearPath RD. Your
        order has been received and will be processed shortly.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{props.orderId}</Text>

        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>
          {props.productName} × {props.quantity}
        </Text>

        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>${props.totalCad.toFixed(2)} CAD</Text>

        <Text style={styles.label}>Shipping Address</Text>
        <Text style={styles.value}>{props.shippingAddress}</Text>
      </Section>

      <Hr />

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.trackOrderUrl}>Track Your Order</Button>
      </Section>

      <Text style={styles.text}>
        You'll receive another email when your kit ships. In the meantime, you
        can track your order status anytime using the button above.
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
