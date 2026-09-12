import { Panel } from './Panel';

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Panel className="bg-bg p-4">
      <div className="metric">{value}</div>
      <div className="lbl mt-1.5">{label}</div>
    </Panel>
  );
}
