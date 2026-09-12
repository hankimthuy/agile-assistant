const SEVERITY_STYLES: Record<string, string> = {
  high: 'tag-strong',
  medium: 'tag-accent',
  low: 'tag-neutral',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'tag-accent',
  medium: 'tag-outline',
  low: 'tag-neutral',
};

export function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  return <span className={`tag capitalize ${SEVERITY_STYLES[severity]}`}>{severity}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  return <span className={`tag capitalize ${CONFIDENCE_STYLES[confidence]}`}>{confidence}</span>;
}
