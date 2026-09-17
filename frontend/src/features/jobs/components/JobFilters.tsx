'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';
import {
  datePostedLabels,
  employmentTypeLabels,
  experienceLevelLabels,
  jobsStrings,
  workplaceTypeLabels,
} from '../labels';

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
}

function CheckboxGroup({ legend, options, selected, onChange }: CheckboxGroupProps) {
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
      {Object.entries(options).map(([value, label]) => {
        // The legend is an Arabic label that can contain spaces (e.g.
        // "مكان العمل"), and spaces are invalid inside an HTML id — which
        // would break the Label htmlFor and stop label clicks from toggling
        // the checkbox. Slugifying keeps the id readable; the uid prefix
        // keeps it unique.
        const id = `${uid}-${legend.replace(/\s+/g, '-')}-${value}`;
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
          </div>
        );
      })}
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

  return (
    <div className="space-y-6">
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
