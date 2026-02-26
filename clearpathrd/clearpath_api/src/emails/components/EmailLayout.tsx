import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import type { ReactNode } from 'react';

export interface EmailLayoutProps {
  children: ReactNode;
  previewText?: string;
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Logo/Header */}
          <Section style={styles.header}>
            <Text style={styles.logo}>ClearPath RD</Text>
            <Text style={styles.tagline}>Professional Radon Testing</Text>
          </Section>

          {/* Main Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Questions? Reply to this email or contact us at{' '}
              <Link href="mailto:support@clearpathrd.com">
                support@clearpathrd.com
              </Link>
            </Text>
            <Text style={styles.footerText}>
              © 2026 ClearPath RD. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  },
  container: { margin: '0 auto', padding: '20px 0', maxWidth: '600px' },
  header: { textAlign: 'center' as const, padding: '20px 0' },
  logo: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a73e8',
    margin: '0',
  },
  tagline: { fontSize: '14px', color: '#666', margin: '5px 0 0 0' },
  content: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '8px',
  },
  hr: { borderColor: '#e6e6e6', margin: '20px 0' },
  footer: { textAlign: 'center' as const, padding: '20px 0' },
  footerText: { fontSize: '12px', color: '#999', margin: '5px 0' },
};
