import type { HTMLAttributes } from 'react';

// The system's one signature ornament (see UI-REDESIGN-SPEC.md / the
// Industry design system): a hairline-bordered, square panel with a
// registration-mark tick in each corner. Used for every card/section
// throughout the redesign in place of the old app's plain `rounded-lg
// border bg-white` cards.
export function Panel({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`blueprint relative ${className}`} {...rest}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </div>
  );
}
