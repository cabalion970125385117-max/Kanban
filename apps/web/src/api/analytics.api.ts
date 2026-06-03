import { getDB } from '@/lib/db';
import { startOfDay, subDays, format, differenceInDays, eachDayOfInterval, startOfWeek, subWeeks } from 'date-fns';

export interface AnalyticsSummary {
  totalCards: number;
  completedCards: number;
  totalTimeMinutes: number;
  totalEstimateHours: number;
  completionRate: number;
  avgCardAgeDays: number;
}

export interface CycleTimePoint {
  bucket: string; // "0-1d", "1-3d", etc.
  count: number;
}

export interface BurndownPoint {
  date: string; // YYYY-MM-DD
  created: number;
  completed: number;
}

export interface HeatmapPoint {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface VelocityPoint {
  week: string; // e.g. "May 5"
  completed: number;
  created: number;
}

async function getAllTimeLogsForBoard(boardId: string) {
  const db = await getDB();
  const cards = await db.getAllFromIndex('cards', 'by-board', boardId);
  const all: import('@/lib/db').TimeLogRow[] = [];
  for (const card of cards) {
    const logs = await db.getAllFromIndex('time_logs', 'by-card', card.id);
    all.push(...logs);
  }
  return all;
}

export async function getAnalyticsSummary(boardId: string): Promise<AnalyticsSummary> {
  const db = await getDB();
  const allCards = await db.getAllFromIndex('cards', 'by-board', boardId);
  const timeLogs = await getAllTimeLogsForBoard(boardId);

  const active = allCards.filter((c) => !c.archived_at);
  const completed = allCards.filter((c) => !!c.archived_at);
  const total = allCards.length;

  const totalTimeMinutes = timeLogs.reduce((sum, l) => sum + l.minutes, 0);
  const totalEstimateHours = active.reduce((sum, c) => sum + (c.estimate_hours ?? 0), 0);

  const now = Date.now();
  const avgAge = active.length
    ? active.reduce((sum, c) => sum + differenceInDays(now, new Date(c.created_at)), 0) / active.length
    : 0;

  return {
    totalCards: total,
    completedCards: completed.length,
    totalTimeMinutes,
    totalEstimateHours,
    completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    avgCardAgeDays: Math.round(avgAge),
  };
}

const BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: '< 1d', min: 0, max: 1 },
  { label: '1–3d', min: 1, max: 3 },
  { label: '3–7d', min: 3, max: 7 },
  { label: '1–2w', min: 7, max: 14 },
  { label: '2–4w', min: 14, max: 28 },
  { label: '> 4w', min: 28, max: Infinity },
];

export async function getCycleTimeData(boardId: string): Promise<CycleTimePoint[]> {
  const db = await getDB();
  const cards = await db.getAllFromIndex('cards', 'by-board', boardId);
  const now = Date.now();

  const counts = Object.fromEntries(BUCKETS.map((b) => [b.label, 0]));
  for (const card of cards) {
    const endDate = card.archived_at ? new Date(card.archived_at).getTime() : now;
    const ageDays = differenceInDays(endDate, new Date(card.created_at));
    const bucket = BUCKETS.find((b) => ageDays >= b.min && ageDays < b.max);
    if (bucket) counts[bucket.label]++;
  }

  return BUCKETS.map((b) => ({ bucket: b.label, count: counts[b.label] }));
}

export async function getBurndownData(boardId: string, days = 30): Promise<BurndownPoint[]> {
  const db = await getDB();
  const cards = await db.getAllFromIndex('cards', 'by-board', boardId);
  const today = startOfDay(new Date());
  const start = subDays(today, days - 1);
  const dateRange = eachDayOfInterval({ start, end: today });

  const createdByDay: Record<string, number> = {};
  const completedByDay: Record<string, number> = {};

  for (const card of cards) {
    const createdDay = format(startOfDay(new Date(card.created_at)), 'yyyy-MM-dd');
    if (new Date(createdDay) >= start) {
      createdByDay[createdDay] = (createdByDay[createdDay] ?? 0) + 1;
    }
    if (card.archived_at) {
      const doneDay = format(startOfDay(new Date(card.archived_at)), 'yyyy-MM-dd');
      if (new Date(doneDay) >= start) {
        completedByDay[doneDay] = (completedByDay[doneDay] ?? 0) + 1;
      }
    }
  }

  let cumCreated = 0;
  let cumCompleted = 0;
  return dateRange.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    cumCreated += createdByDay[key] ?? 0;
    cumCompleted += completedByDay[key] ?? 0;
    return { date: format(d, 'MMM d'), created: cumCreated, completed: cumCompleted };
  });
}

export async function getHeatmapData(boardId: string, days = 84): Promise<HeatmapPoint[]> {
  const db = await getDB();
  const cards = await db.getAllFromIndex('cards', 'by-board', boardId);
  const today = startOfDay(new Date());
  const start = subDays(today, days - 1);
  const dateRange = eachDayOfInterval({ start, end: today });

  const countByDay: Record<string, number> = {};
  for (const card of cards) {
    const d = format(startOfDay(new Date(card.created_at)), 'yyyy-MM-dd');
    if (new Date(d) >= start) {
      countByDay[d] = (countByDay[d] ?? 0) + 1;
    }
    if (card.archived_at) {
      const d2 = format(startOfDay(new Date(card.archived_at)), 'yyyy-MM-dd');
      if (new Date(d2) >= start) {
        countByDay[d2] = (countByDay[d2] ?? 0) + 1;
      }
    }
  }

  const max = Math.max(...Object.values(countByDay), 1);
  return dateRange.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    const count = countByDay[key] ?? 0;
    const ratio = count / max;
    const level = (count === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4) as 0 | 1 | 2 | 3 | 4;
    return { date: key, count, level };
  });
}

export async function getVelocityData(boardId: string, weeks = 8): Promise<VelocityPoint[]> {
  const db = await getDB();
  const cards = await db.getAllFromIndex('cards', 'by-board', boardId);
  const today = startOfDay(new Date());

  const result: VelocityPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i));
    const weekEnd = subDays(startOfWeek(subWeeks(today, i - 1)), 0);
    const label = format(weekStart, 'MMM d');

    let created = 0;
    let completed = 0;
    for (const card of cards) {
      const createdAt = new Date(card.created_at);
      if (createdAt >= weekStart && createdAt <= weekEnd) created++;
      if (card.archived_at) {
        const archivedAt = new Date(card.archived_at);
        if (archivedAt >= weekStart && archivedAt <= weekEnd) completed++;
      }
    }
    result.push({ week: label, completed, created });
  }
  return result;
}

