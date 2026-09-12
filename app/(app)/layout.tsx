import { loadSprintData } from '@/lib/data/jira';
import { Sidebar } from '@/components/Sidebar';

// Shared shell for every signed-in screen (Overview, Ops Hub, Auto Report,
// Process Health, Doc Linker, Performance Import) — the left sidebar nav
// that replaces the old top bar (components/Nav.tsx). The public landing
// page (app/page.tsx) intentionally sits outside this route group and
// keeps its own marketing header instead.
export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  let sprintName: string | undefined;
  try {
    const data = await loadSprintData();
    sprintName = data.sprint.name;
  } catch {
    sprintName = undefined;
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_1fr]">
      <Sidebar sprintName={sprintName} />
      <main className="min-w-0 px-6 py-6 md:px-8">{children}</main>
    </div>
  );
}
