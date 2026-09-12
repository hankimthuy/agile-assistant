'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Ops Hub' },
  { href: '/report', label: 'Report' },
  { href: '/process-health', label: 'Process Health' },
  { href: '/doc-linker', label: 'Doc Linker' },
  { href: '/azure-import', label: 'Azure Import' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
        <span className="font-semibold text-gray-900">AgileCopilot</span>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
