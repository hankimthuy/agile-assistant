'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { OpsItem, ProcessHealthViolation } from '@/lib/types';

const LINKS = [
  {
    href: '/overview',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/ops-hub',
    label: 'Ops Hub',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
    badgeKey: 'ops' as const,
  },
  {
    href: '/report',
    label: 'Auto Report',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v5h6" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    href: '/process-health',
    label: 'Process Health',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    badgeKey: 'health' as const,
  },
  {
    href: '/doc-linker',
    label: 'Doc Linker',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/performance-import',
    label: 'Performance Import',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8l-5-5-5 5" />
        <path d="M12 3v12" />
      </svg>
    ),
  },
];

export function Sidebar({ sprintName }: { sprintName?: string }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ ops?: number; health?: number }>({});

  // Sidebar badges mirror real counts from the same endpoints each screen
  // already uses (ops inbox items, process-health violations) — not
  // fabricated numbers.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ops-inbox')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: OpsItem[] } | null) => {
        if (!cancelled && data) setCounts((c) => ({ ...c, ops: data.items.length }));
      })
      .catch(() => {});
    fetch('/api/process-health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { violations: ProcessHealthViolation[] } | null) => {
        if (!cancelled && data) setCounts((c) => ({ ...c, health: data.violations.length }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 border-r border-line py-5">
      <div className="px-4">
        <span className="font-heading text-[17px] font-semibold tracking-wide">AGILECOPILOT</span>
        <div className="lbl mt-0.5">{sprintName ? `${sprintName} · Scrum Master` : 'Scrum Master workspace'}</div>
      </div>

      <nav className="flex flex-col">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const count = link.badgeKey ? counts[link.badgeKey] : undefined;
          return (
            <Link key={link.href} href={link.href} className="sb-item" aria-current={active ? 'page' : undefined}>
              {link.icon}
              {link.label}
              {count !== undefined && (
                <span className={`tag ml-auto text-[10px] ${link.badgeKey === 'ops' ? 'tag-accent' : 'tag-neutral'}`}>{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-line px-4 pt-3.5">
        <div className="grid h-7 w-7 place-items-center border border-line font-heading text-xs font-semibold">SM</div>
        <div className="leading-tight">
          <div className="text-[13px] font-medium">Scrum Master</div>
          <div className="text-[11px] text-muted">Signed in via fixture data</div>
        </div>
      </div>
    </div>
  );
}
