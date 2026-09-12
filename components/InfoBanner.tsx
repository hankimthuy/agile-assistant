import Link from 'next/link';
import { Panel } from './Panel';

// A dismiss-free, static callout for surfacing a capability from the home
// screen — see UI-REDESIGN-SPEC.md §8 "Screen: Azure Import" and spec.md
// Epic 6. Kept intentionally simple (no localStorage-tracked dismissal) to
// match this POC's "keep it simple" scope.
export function InfoBanner({
  title,
  body,
  linkHref,
  linkLabel,
}: {
  title: string;
  body: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <Panel className="p-4 text-sm" style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}>
      <span className="font-heading font-semibold text-accent-800">{title}</span>{' '}
      <span className="text-muted">{body}</span>{' '}
      <Link href={linkHref} className="font-heading font-semibold text-accent-800 underline">
        {linkLabel}
      </Link>
    </Panel>
  );
}
