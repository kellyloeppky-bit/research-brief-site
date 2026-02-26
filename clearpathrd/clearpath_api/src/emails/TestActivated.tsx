import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface TestActivatedProps {
  homeAddress: string;
  kitSerialNumber: string;
  kitType: 'long_term' | 'real_estate_short';
  activatedAt: Date;
  expectedCompletionDate: Date;
  retrievalDueAt: Date;
  dashboardUrl: string;
}

export default function TestActivated(props: TestActivatedProps) {
  const durationDays = props.kitType === 'long_term' ? 91 : 4;
  const testTypeName =
    props.kitType === 'long_term'
      ? 'Long-Term (91 days)'
      : 'Real Estate Short-Term (4 days)';

  return (
    <EmailLayout previewText="Your radon test has been activated">
      <Text style={styles.heading}>Your Radon Test is Active ✅</Text>
      <Text style={styles.text}>
        You've successfully activated your radon test kit. Your {durationDays}
        -day testing period has begun.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Test Type</Text>
        <Text style={styles.value}>{testTypeName}</Text>

        <Text style={styles.label}>Kit Serial Number</Text>
        <Text style={styles.value}>{props.kitSerialNumber}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{props.homeAddress}</Text>

        <Text style={styles.label}>Started</Text>
        <Text style={styles.value}>
          {props.activatedAt.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Text style={styles.label}>Retrieve Kit By</Text>
        <Text style={styles.value}>
          {props.retrievalDueAt.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Text style={styles.label}>Expected Completion</Text>
        <Text style={styles.value}>
          {props.expectedCompletionDate.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
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
          ⏰ Important Reminder
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: '#333',
            margin: '0',
            lineHeight: '20px',
          }}
        >
          Do not move or disturb the test kit during the testing period. We'll
          send you reminders as your retrieval date approaches.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.dashboardUrl}>View Test Dashboard</Button>
      </Section>

      <Text style={styles.text}>
        Track your test progress anytime by visiting your dashboard. We'll
        notify you when it's time to retrieve and mail your kit.
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
