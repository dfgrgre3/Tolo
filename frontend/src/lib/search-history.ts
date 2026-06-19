/**
 * Client-side search history tracking using localStorage.
 * Stores recent search queries to power "اقتراحات التعلم القادمة" on the dashboard.
 */

const STORAGE_KEY = 'thanawy_search_history';
const MAX_ITEMS = 10;

export interface SearchEntry {
  query: string;
  timestamp: number;
}

export function getSearchHistory(): SearchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: SearchEntry[] = JSON.parse(raw);
    return Array.isArray(entries) ? entries.sort((a, b) => b.timestamp - a.timestamp) : [];
  } catch {
    return [];
  }
}

export function addSearchQuery(query: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return;

  try {
    const history = getSearchHistory();
    // Remove duplicate if exists
    const filtered = history.filter((e) => e.query !== trimmed);
    filtered.unshift({ query: trimmed, timestamp: Date.now() });
    // Keep only latest MAX_ITEMS
    const pruned = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // localStorage not available
  }
}

/**
 * Returns unique search queries from recent history (excluding duplicates).
 */
export function getRecentSearchQueries(): string[] {
  return getSearchHistory().map((e) => e.query);
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}