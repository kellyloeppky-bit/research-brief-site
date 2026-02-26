import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface ResultsAvailableProps {
  homeAddress: string;
  valueBqm3: number;
  riskZone: 'below_guideline' | 'caution' | 'action_required' | 'urgent_action';
  viewResultsUrl: string;
}

export default function ResultsAvailable(props: ResultsAvailableProps) {
  const riskInfo = getRiskInfo(props.riskZone);

  return (
    <EmailLayout previewText="Your radon test results are ready">
      <Text style={styles.heading}>Your Radon Test Results Are Ready 📊</Text>
      <Text style={styles.text}>
        Your radon test has been analyzed by our certified laboratory. Your
        results are now available to view.
      </Text>

      <Hr />

      <Section
        style={{
          textAlign: 'center',
          backgroundColor: riskInfo.bgColor,
          padding: '30px',
          borderRadius: '8px',
          margin: '20px 0',
        }}
      >
        <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 10px 0' }}>
          Radon Level
        </Text>
        <Text
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: riskInfo.color,
            margin: '0',
          }}
        >
          {props.valueBqm3}
        </Text>
        <Text style={{ fontSize: '14px', color: '#666', margin: '5px 0 15px 0' }}>
          Bq/m³
        </Text>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: riskInfo.color,
            margin: '0',
          }}
        >
          {riskInfo.label}
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '6px',
          margin: '20px 0',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            fontWeight: '600',
            margin: '0 0 10px 0',
          }}
        >
          What does this mean?
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: '#333',
            margin: '0',
            lineHeight: '20px',
          }}
        >
          {riskInfo.message}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.viewResultsUrl}>View Full Results</Button>
      </Section>

      <Text style={styles.text}>
        Your detailed results include historical data, recommendations, and next
        steps. Download your certificate from the dashboard.
      </Text>
    </EmailLayout>
  );
}

function getRiskInfo(zone: string) {
  switch (zone) {
    case 'below_guideline':
      return {
        label: 'Below Guideline',
        color: '#10b981',
        bgColor: '#f0fdf4',
        message:
          "Great news! Your radon level is below Health Canada's guideline of 200 Bq/m³. No action needed at this time.",
      };
    case 'caution':
      return {
        label: 'Caution Zone',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        message:
          'Your radon level is above the guideline. Consider mitigation within 2 years. We can connect you with certified contractors.',
      };
    case 'action_required':
      return {
        label: 'Action Required',
        color: '#ef4444',
        bgColor: '#fef2f2',
        message:
          'Your radon level requires mitigation within 1 year. We strongly recommend contacting a certified contractor soon.',
      };
    case 'urgent_action':
      return {
        label: 'Urgent Action Required',
        color: '#dc2626',
        bgColor: '#fef2f2',
        message:
          'Your radon level is very high and requires immediate mitigation. Please contact a certified contractor as soon as possible.',
      };
    default:
      return {
        label: 'Unknown',
        color: '#666',
        bgColor: '#f9f9f9',
        message: 'Please review your results in the dashboard.',
      };
  }
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
