import { Button as EmailButton } from '@react-email/components';
import type { ReactNode } from 'react';

export interface ButtonProps {
  href: string;
  children: ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: '#1a73e8',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        display: 'inline-block',
        fontWeight: '600',
      }}
    >
      {children}
    </EmailButton>
  );
}
