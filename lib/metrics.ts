import type { SprintData } from './types';

export interface SprintMetrics {
  velocity: number; // sum of storyPoints across done tickets
  completionRate: number; // doneCount / totalCount, 0..1
  openBugCount: number;
  closedBugCount: number;
  doneCount: number;
  totalCount: number;
}

export function computeSprintMetrics(data: SprintData): SprintMetrics {
  const { tickets } = data;
  const doneTickets = tickets.filter((t) => t.status === 'done');
  const velocity = doneTickets.reduce((sum, t) => sum + t.storyPoints, 0);
  const bugs = tickets.filter((t) => t.type === 'bug');
  const openBugCount = bugs.filter((t) => t.status !== 'done').length;
  const closedBugCount = bugs.filter((t) => t.status === 'done').length;

  return {
    velocity,
    completionRate: tickets.length === 0 ? 0 : doneTickets.length / tickets.length,
    openBugCount,
    closedBugCount,
    doneCount: doneTickets.length,
    totalCount: tickets.length,
  };
}
