import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface RetrievalDueProps {
  homeAddress: string;
  kitSerialNumber: string;
  retrievalDueAt: Date;
  daysActive: number;
  dashboardUrl: string;
}

export default function RetrievalDue(props: RetrievalDueProps) {
  return (
    <EmailLayout previewText="Time to retrieve your radon test kit">
      <Text style={styles.heading}>Time to Retrieve Your Kit! ⏰</Text>
      <Text style={styles.text}>
        Your radon test has been active for {props.daysActive} days. It's now
        time to retrieve your test kit and mail it back to our laboratory for
        analysis.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Kit Serial Number</Text>
        <Text style={styles.value}>{props.kitSerialNumber}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{props.homeAddress}</Text>

        <Text style={styles.label}>Retrieval Due Date</Text>
        <Text style={styles.value}>
          {props.retrievalDueAt.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Text style={styles.label}>Days Active</Text>
        <Text style={styles.value}>{props.daysActive} days</Text>
      </Section>

      <Hr />

      <Section
        style={{
          backgroundColor: '#fffbeb',
          padding: '20px',
          borderRadius: '6px',
          margin: '20px 0',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            color: '#f59e0b',
            fontWeight: '600',
            margin: '0 0 10px 0',
          }}
        >
          📦 Next Steps
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: '#333',
            margin: '0',
            lineHeight: '20px',
          }}
        >
          1. Retrieve the test kit from its location
          <br />
          2. Seal the kit in the provided bag
          <br />
          3. Mail it back to our laboratory using the prepaid shipping label
          <br />
          4. Mark as "mailed" in your dashboard
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.dashboardUrl}>View Dashboard</Button>
      </Section>

      <Text style={styles.text}>
        Once you've mailed the kit, we'll analyze your sample and send you the
        results within 5-7 business days.
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
