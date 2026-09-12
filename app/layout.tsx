import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'AgileCopilot',
  description: 'The connective layer over Jira, Confluence, and Teams for Scrum Masters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
