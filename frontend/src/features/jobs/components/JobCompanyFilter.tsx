'use client';

import React from 'react';
import { Building2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanies, useCompanyLabels } from '@/hooks/use-jobs';
import { jobsStrings } from '../labels';
import { companyFallbackLabel } from '../search-params';
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';

/** Below two characters the search endpoint matches almost every company. */
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 10;

/**
 * Company filter as a typeahead, not a checkbox list.
 *
 * There is no bounded set of employers to hardcode: the list grows with every
 * company that signs up, and matching any of them would mean a request per
 * keystroke, so typing queries /companies for a short page instead. The chosen
 * ids land in the URL exactly like the other filters, which keeps a search
 * shareable.
 *
 * Selections stay visible as removable pills even while the dropdown is closed,
 * because the URL (not the input) is the source of truth: a shared link can
 * arrive with companies already filtered and nothing typed in the box.
 */
export function JobCompanyFilter({
  filters,
  onChange,
}: {
  filters: JobSearchParams;
  onChange: (patch: Partial<JobSearchParams>) => void;
}) {
  const uid = React.useId();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const trimmed = query.trim();
  const debouncedQuery = useDebounce(trimmed, SEARCH_DEBOUNCE_MS);
  const ready = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useCompanies({
    search: ready ? debouncedQuery : undefined,
    limit: RESULT_LIMIT,
    enabled: ready,
  });

  const selected = filters.company ?? [];
  // Labels come from the cache, so a company picked in an earlier visit (or
  // restored from a shared link) still renders as a name rather than an id.
  const labels = useCompanyLabels(selected);
  const results = ready ? data?.items ?? [] : [];
  const listId = `${uid}-company-list`;

  const toggleCompany = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    // An empty array would serialise to nothing, so clear the key outright and
    // keep the URL (and therefore the cache key) canonical.
    onChange({ company: next.length > 0 ? next : undefined });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-company-search`} className="text-sm font-medium">
        {jobsStrings.company}
      </Label>

      {/*
        focusout bubbles, so the dropdown closes only once focus leaves the whole
        widget — clicking an option (a real button, reachable by keyboard too)
        keeps it open and lets the click land.
      */}
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <Building2 className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
        <Input
          id={`${uid}-company-search`}
          type="search"
          role="combobox"
          aria-expanded={open && ready}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={jobsStrings.companySearchPlaceholder}
          className="ps-9"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        />

        {open && ready ? (
          <div
            id={listId}
            role="listbox"
            aria-label={jobsStrings.company}
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {results.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {isFetching ? jobsStrings.loading : jobsStrings.noCompanyResults}
              </p>
            ) : (
              results.map((company) => {
                const isSelected = selected.includes(company.id);
                return (
                  <button
                    key={company.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleCompany(company.id)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">{company.name}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}

        {open && !ready && trimmed.length > 0 ? (
          <p className="pt-1 text-xs text-muted-foreground">{jobsStrings.companySearchHint}</p>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const label = labels[id] ?? companyFallbackLabel(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCompany(id)}
                aria-label={jobsStrings.removeChip(label)}
                className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
              >
                <span className="truncate">{label}</span>
                <X className="h-3 w-3 shrink-0" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
