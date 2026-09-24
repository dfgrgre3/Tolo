'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useJobCategories } from '@/hooks/use-jobs';
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';
import { JobCompanyFilter } from './JobCompanyFilter';
import {
  datePostedLabels,
  employmentTypeLabels,
  experienceLevelLabels,
  jobsStrings,
  workplaceTypeLabels,
} from '../labels';
import { prettifyFilterValue } from '../search-params';

/**
 * The filter panel body, shared verbatim between the desktop sidebar and the
 * mobile drawer. One implementation means the two can never offer different
 * filters — a real risk when each surface has its own copy.
 *
 * It is a controlled component: the parent owns the filter state (which is
 * itself derived from the URL), so a filter change is always reflected in a
 * shareable, back-button-navigable address.
 */

interface CheckboxGroupProps {
  legend: string;
  options: Record<string, string>;
  selected: string[];
  onChange: (next: string[]) => void;
  /** Live totals per option, shown as a trailing badge where known. */
  counts?: Record<string, number>;
  /** Renders placeholder rows instead of options while the list loads. */
  loading?: boolean;
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  counts,
  loading,
}: CheckboxGroupProps) {
  // This panel is mounted in both the desktop sidebar and the mobile drawer,
  // so a static id would exist twice in the DOM and a label click in the
  // drawer would resolve to the hidden sidebar instance. useId is unique per
  // mount position, giving each surface its own namespace.
  const uid = React.useId();

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    );
  };

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      {loading ? (
        // Placeholder rows match the height of a real option so the panel does
        // not jump when the list arrives.
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        Object.entries(options).map(([value, label]) => {
          // The legend is an Arabic label that can contain spaces (e.g.
          // "مكان العمل"), and spaces are invalid inside an HTML id — which
          // would break the Label htmlFor and stop label clicks from toggling
          // the checkbox. Slugifying keeps the id readable; the uid prefix
          // keeps it unique.
          const id = `${uid}-${legend.replace(/\s+/g, '-')}-${value}`;
          const count = counts?.[value];
          return (
            <div key={value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(value)}
                onCheckedChange={() => toggle(value)}
              />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                {label}
              </Label>
              {count !== undefined ? (
                <span className="ms-auto text-xs text-muted-foreground">
                  {count.toLocaleString('ar-EG')}
                </span>
              ) : null}
            </div>
          );
        })
      )}
    </fieldset>
  );
}

export function JobFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: JobSearchParams;
  onChange: (patch: Partial<JobSearchParams>) => void;
  onClear: () => void;
}) {
  // Same rationale as CheckboxGroup: the panel is rendered per surface.
  const uid = React.useId();

  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } =
    useJobCategories();

  /**
   * Why only the category and company groups are data-driven.
   *
   * `jobType`, `workplace`, `experience` and `datePosted` are closed enums in
   * the API contract: swagger enumerates their accepted values, and datePosted
   * takes only 1, 3, 7 or 30. Their option sets cannot change without a
   * coordinated deploy, so listing them statically keeps the panel paintable
   * with zero requests. Categories and companies are open sets owned by the
   * data — a category shows up the moment an employer posts under it, and an
   * employer the moment a company signs up — so those two are fetched from
   * /jobs/categories and /companies.
   */
  const categoryOptions = React.useMemo(() => {
    const options: Record<string, string> = {};
    const counts: Record<string, number> = {};

    for (const item of categories ?? []) {
      options[item.category] = prettifyFilterValue(item.category);
      counts[item.category] = item.count;
    }
    // A shared link can carry a category with no open posting left, so
    // /jobs/categories no longer returns it. Without this merge the only way to
    // drop that filter would be the clear-all button.
    for (const selected of filters.category ?? []) {
      if (!(selected in options)) options[selected] = prettifyFilterValue(selected);
    }

    return { options, counts };
  }, [categories, filters.category]);

  return (
    <div className="space-y-6">
      {/*
        Remote is a switch, not a checkbox: the API documents it as shorthand for
        workplace=REMOTE, so presenting it as a third workplace option would make
        the two controls contradict each other.
      */}
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${uid}-remote`} className="cursor-pointer text-sm font-medium">
          {jobsStrings.remoteOnly}
        </Label>
        <Switch
          id={`${uid}-remote`}
          checked={filters.remote === true}
          onCheckedChange={(checked) => onChange({ remote: checked ? true : undefined })}
        />
      </div>

      <CheckboxGroup
        legend={jobsStrings.workplace}
        options={workplaceTypeLabels}
        selected={filters.workplace ?? []}
        onChange={(workplace) => onChange({ workplace })}
      />

      <CheckboxGroup
        legend={jobsStrings.jobType}
        options={employmentTypeLabels}
        selected={filters.jobType ?? []}
        onChange={(jobType) => onChange({ jobType })}
      />

      <CheckboxGroup
        legend={jobsStrings.experience}
        options={experienceLevelLabels}
        selected={filters.experience ?? []}
        onChange={(experience) => onChange({ experience })}
      />

      {/*
        A failed /jobs/categories request hides this section rather than showing
        an empty box: every other filter still works, and the chips row keeps an
        already-applied category visible and removable.
      */}
      {categoriesError ? null : (
        <CheckboxGroup
          legend={jobsStrings.category}
          options={categoryOptions.options}
          counts={categoryOptions.counts}
          loading={categoriesLoading}
          selected={filters.category ?? []}
          onChange={(category) => onChange({ category })}
        />
      )}

      <JobCompanyFilter filters={filters} onChange={onChange} />

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{jobsStrings.datePosted}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(datePostedLabels).map(([days, label]) => {
            const value = Number(days);
            const active = filters.datePosted === value;
            return (
              <Button
                key={days}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                aria-pressed={active}
                // Clicking the active chip clears it, so the filter is
                // reversible without a separate "any time" option.
                onClick={() => onChange({ datePosted: active ? undefined : value })}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{jobsStrings.salaryRange}</legend>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor={`${uid}-salary-min`} className="sr-only">
              {jobsStrings.salaryMin}
            </Label>
            <Input
              id={`${uid}-salary-min`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="من"
              value={filters.salaryMin ?? ''}
              onChange={(event) =>
                onChange({
                  salaryMin: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            />
          </div>
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <div className="flex-1">
            <Label htmlFor={`${uid}-salary-max`} className="sr-only">
              {jobsStrings.salaryMax}
            </Label>
            <Input
              id={`${uid}-salary-max`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="إلى"
              value={filters.salaryMax ?? ''}
              onChange={(event) =>
                onChange({
                  salaryMax: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      </fieldset>

      <Button type="button" variant="ghost" size="sm" onClick={onClear} className="w-full">
        {jobsStrings.clearFilters}
      </Button>
    </div>
  );
}
