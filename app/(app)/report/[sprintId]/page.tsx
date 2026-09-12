import { redirect } from 'next/navigation';

// The Teams webhook message links to /report/:sprintId (spec.md §7). This POC
// only ever has one sprint in play, so the deep link just lands on the Report
// view rather than maintaining a second copy of it per sprint id.
export default function ReportDeepLink() {
  redirect('/report');
}
