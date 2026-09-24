/**
 * Auth Layout
 * Used for welcome and role selection screens
 */

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="size-full bg-[var(--paper)] flex items-center justify-center">
      {children}
    </div>
  );
}
