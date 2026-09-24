/**
 * URL ⇄ filter serialisation and active-filter chips for /jobs/search.
 *
 * Both directions used to live inline in the page component, which meant the
 * two rules the whole search experience rests on — what a query string means
 * for the request, and what an applied filter looks like in the URL — could
 * only be exercised by rendering the page. They live here so they are unit
 * testable, and so the chips row shares the exact key lists the parser uses.
 */
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';
import type { EmploymentType, ExperienceLevel, WorkplaceType } from '@/types/job';
import {
  datePostedLabels,
  employmentTypeLabels,
  experienceLevelLabels,
  jobsStrings,
  sortLabels,
  workplaceTypeLabels,
} from './labels';

/** Filters holding several values; the URL carries them comma-separated. */
export const ARRAY_KEYS = [
  'jobType',
  'workplace',
  'experience',
  'category',
  'skills',
  'company',
] as const;

/** Filters holding a single number. */
export const NUMBER_KEYS = ['salaryMin', 'salaryMax', 'datePosted', 'page'] as const;

/**
 * The URL is the single source of truth for the search state.
 *
 * Parsing from and serialising back to the query string (rather than holding
 * filters only in React state) is what makes a search shareable, bookmarkable
 * and correct under browser back/forward — all of which the spec requires of
 * /jobs/search.
 */
export function parseFilters(params: URLSearchParams): JobSearchParams {
  const filters: JobSearchParams = {};

  const keyword = params.get('keyword');
  if (keyword) filters.keyword = keyword;

  const location = params.get('location');
  if (location) filters.location = location;

  if (params.get('remote') === 'true') filters.remote = true;

  for (const key of ARRAY_KEYS) {
    const raw = params.get(key);
    if (raw) filters[key] = raw.split(',').filter(Boolean);
  }

  for (const key of NUMBER_KEYS) {
    const raw = params.get(key);
    if (raw && Number.isFinite(Number(raw))) filters[key] = Number(raw);
  }

  const sort = params.get('sort');
  if (sort && sort in sortLabels) filters.sort = sort as JobSearchParams['sort'];

  return filters;
}

export function serialiseFilters(filters: JobSearchParams): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}
/**
 * Default display text for a filter value with no label of its own.
 *
 * Categories are owned by the data — an employer can post under a category that
 * is not in the current /jobs/categories list — so a shared link may carry a
 * value we have no label for. A chip must still read as words rather than as a
 * bare slug, and turning `data-science` into `data science` does that without
 * inventing information.
 */
export function prettifyFilterValue(value: string): string {
  return value.replace(/[-_]+/g, ' ').trim();
}

/**
 * Last-resort label for a company id we could not resolve to a name. Trims the
 * uuid so the chip stays one line instead of stretching the row.
 */
export function companyFallbackLabel(id: string): string {
  return id.slice(0, 8);
}

export interface ActiveFilterChip {
  /** Stable React key: the field plus the value this chip removes. */
  id: string;
  /** The filter this chip clears. */
  field: keyof JobSearchParams;
  /** Array filters: the one value to drop. Undefined means "clear the field". */
  value?: string;
  /** Already-localised display text. */
  label: string;
}

export interface FilterLabelSources {
  /** category value → display label, read from /jobs/categories. */
  categories?: Record<string, string>;
  /** company id → display name, resolved through the companies cache. */
  companies?: Record<string, string>;
}

type ArrayFilterKey = 'jobType' | 'workplace' | 'experience' | 'category' | 'company' | 'skills';
/**
 * Turns the current filters into the chips row, one chip per applied value.
 *
 * Data-backed filters (category, company) take their label from `sources`: the
 * URL only carries values, and for a company that value is an opaque id. The
 * enum-backed groups fall back to their own label map, which also covers a URL
 * that was hand-edited to an unknown value.
 */
export function buildActiveFilterChips(
  filters: JobSearchParams,
  sources: FilterLabelSources = {}
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  const pushArray = (field: ArrayFilterKey, label: (value: string) => string) => {
    for (const value of filters[field] ?? []) {
      chips.push({ id: `${field}:${value}`, field, value, label: label(value) });
    }
  };

  if (filters.keyword) chips.push({ id: 'keyword', field: 'keyword', label: filters.keyword });
  if (filters.location) chips.push({ id: 'location', field: 'location', label: filters.location });
  // `remote` is a boolean; a chip reading "true" would be meaningless, so it is
  // spelled out with the same wording as the switch that set it.
  if (filters.remote) chips.push({ id: 'remote', field: 'remote', label: jobsStrings.remoteOnly });

  pushArray(
    'jobType',
    (value) => employmentTypeLabels[value as EmploymentType] ?? prettifyFilterValue(value)
  );
  pushArray(
    'workplace',
    (value) => workplaceTypeLabels[value as WorkplaceType] ?? prettifyFilterValue(value)
  );
  pushArray(
    'experience',
    (value) => experienceLevelLabels[value as ExperienceLevel] ?? prettifyFilterValue(value)
  );
  pushArray('category', (value) => sources.categories?.[value] ?? prettifyFilterValue(value));
  pushArray('company', (value) => sources.companies?.[value] ?? companyFallbackLabel(value));
  // Skills arrive as free text (there is no skills picker yet), so the stored
  // value is already its own label.
  pushArray('skills', (value) => value);

  if (filters.salaryMin !== undefined) {
    chips.push({
      id: 'salaryMin',
      field: 'salaryMin',
      label: jobsStrings.salaryAtLeast(filters.salaryMin),
    });
  }
  if (filters.salaryMax !== undefined) {
    chips.push({
      id: 'salaryMax',
      field: 'salaryMax',
      label: jobsStrings.salaryAtMost(filters.salaryMax),
    });
  }
  if (filters.datePosted !== undefined) {
    chips.push({
      id: 'datePosted',
      field: 'datePosted',
      label: datePostedLabels[filters.datePosted] ?? String(filters.datePosted),
    });
  }

  // `sort` and `page` are deliberately absent: sort is a dropdown that already
  // shows its own value, and a page number is navigation, not a filter the user
  // applied.

  return chips;
}

/**
 * Applies a chip removal and returns the next filters, page reset included.
 *
 * The switch is explicit (rather than indexing by `chip.field`) so that adding
 * a filter to JobSearchParams becomes a type error here instead of a silently
 * un-clearable chip. Paging always resets for the same reason a filter change
 * resets it in the page: page 7 of a result set that just shrank is empty for
 * no visible reason.
 */
export function removeFilterChip(
  filters: JobSearchParams,
  chip: ActiveFilterChip
): JobSearchParams {
  const next: JobSearchParams = { ...filters, page: undefined };

  switch (chip.field) {
    case 'jobType':
      next.jobType = dropValue(filters.jobType, chip.value);
      break;
    case 'workplace':
      next.workplace = dropValue(filters.workplace, chip.value);
      break;
    case 'experience':
      next.experience = dropValue(filters.experience, chip.value);
      break;
    case 'category':
      next.category = dropValue(filters.category, chip.value);
      break;
    case 'company':
      next.company = dropValue(filters.company, chip.value);
      break;
    case 'skills':
      next.skills = dropValue(filters.skills, chip.value);
      break;
    case 'keyword':
      next.keyword = undefined;
      break;
    case 'location':
      next.location = undefined;
      break;
    case 'salaryMin':
      next.salaryMin = undefined;
      break;
    case 'salaryMax':
      next.salaryMax = undefined;
      break;
    case 'datePosted':
      next.datePosted = undefined;
      break;
    case 'remote':
      next.remote = undefined;
      break;
    case 'sort':
      next.sort = undefined;
      break;
    // `page`/`limit` never produce a chip (see buildActiveFilterChips); the
    // page reset above is all they need.
    default:
      break;
  }

  return next;
}

/** Removes one value from an array filter, dropping the key when it empties. */
function dropValue(current: string[] | undefined, value?: string): string[] | undefined {
  if (!current || value === undefined) return undefined;
  const remaining = current.filter((item) => item !== value);
  return remaining.length > 0 ? remaining : undefined;
}


