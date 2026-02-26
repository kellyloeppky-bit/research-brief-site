import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface CertificateReadyProps {
  certificateNumber: string;
  homeAddress: string;
  valueBqm3: number;
  issuedDate: Date;
  validUntil: Date;
  certificateUrl: string;
}

export default function CertificateReady(props: CertificateReadyProps) {
  return (
    <EmailLayout previewText="Your radon test certificate is ready">
      <Text style={styles.heading}>Your Certificate is Ready 📜</Text>
      <Text style={styles.text}>
        Your official radon test certificate has been generated and is now
        available for download.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Certificate Number</Text>
        <Text style={styles.value}>{props.certificateNumber}</Text>

        <Text style={styles.label}>Property Address</Text>
        <Text style={styles.value}>{props.homeAddress}</Text>

        <Text style={styles.label}>Radon Level</Text>
        <Text style={styles.value}>{props.valueBqm3} Bq/m³</Text>

        <Text style={styles.label}>Issued Date</Text>
        <Text style={styles.value}>
          {props.issuedDate.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        <Text style={styles.label}>Valid Until</Text>
        <Text style={styles.value}>
          {props.validUntil.toLocaleDateString('en-CA', {
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
          📄 Certificate Details
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: '#333',
            margin: '0',
            lineHeight: '20px',
          }}
        >
          This certificate is valid for 2 years from the issue date. It can be
          used for real estate transactions, insurance purposes, or personal
          records.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.certificateUrl}>Download Certificate</Button>
      </Section>

      <Text style={styles.text}>
        Keep this certificate for your records. You can access it anytime from
        your dashboard. Anyone can verify its authenticity using the
        certificate number.
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
