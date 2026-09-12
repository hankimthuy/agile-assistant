import Link from 'next/link';

// A dismiss-free, static callout for surfacing a capability from the home
// screen (Ops Hub) — see UI-REDESIGN-SPEC.md §8 "Screen: Azure Import" and
// spec.md Epic 6. Kept intentionally simple (no localStorage-tracked
// dismissal) to match this POC's "keep it simple" scope.
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
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <span className="font-semibold">{title}</span> {body}{' '}
      <Link href={linkHref} className="font-medium underline">
        {linkLabel}
      </Link>
    </div>
  );
}
