import type {
  CareLog,
  PlantSpecies,
  Pot,
  UUID,
} from '../../domain/types';

const HEADER = ['date', 'time', 'plant', 'species', 'action', 'outcome', 'notes'];

function escapeCell(value: string): string {
  if (value === '') return '';
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateParts(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function toCareHistoryCSV(
  logs: CareLog[],
  pots: Map<UUID, Pot>,
  species: Map<UUID, PlantSpecies>,
): string {
  const rows: string[] = [HEADER.join(',')];
  const sorted = [...logs].sort((a, b) => a.performed_at - b.performed_at);
  for (const log of sorted) {
    const pot = pots.get(log.pot_id);
    const sp = pot ? species.get(pot.species_id) : undefined;
    const { date, time } = dateParts(log.performed_at);
    const row = [
      date,
      time,
      pot?.display_name ?? '',
      sp?.common_name ?? '',
      log.action_type,
      log.action,
      log.notes ?? '',
    ].map(escapeCell);
    rows.push(row.join(','));
  }
  return rows.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const __csvTestHooks = { HEADER, escapeCell };
