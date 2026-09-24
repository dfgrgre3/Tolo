'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useProfileData } from '@/app/(dashboard)/profile/_components/useProfileData';
import { useAuth } from '@/hooks/use-auth';
import { useApplyToJob, useJob } from '@/hooks/use-jobs';
import { JobsErrorState } from '@/features/jobs/components/JobStates';
import { jobsStrings } from '@/features/jobs/labels';
import {
  isValidHttpUrl,
  loadResumeUrl,
  prefillApplyForm,
  type ApplyPrefill,
} from '@/features/jobs/profile';
import {
  collectAnswers,
  findMissingRequiredAnswers,
} from '@/features/jobs/questions';
import { ApiError } from '@/lib/api/api-client';
import type { Job, JobQuestion } from '@/types/job';

type Step = 'details' | 'review';

interface FormState {
  email: string;
  phone: string;
  resumeUrl: string;
  coverLetter: string;
  /** Screening answers keyed by question id; one entry per rendered question. */
  answers: Record<string, string>;
}

interface FieldErrors {
  email?: string;
  resumeUrl?: string;
  /** Per-question error, keyed by question id. */
  answers?: Record<string, string>;
}

/** Server-side cap on the cover letter. Mirrors the backend validation. */
const COVER_LETTER_MAX = 20000;

/**
 * Client-side validation. It mirrors the server's own checks (which remain the
 * authority) purely so the user gets immediate, in-field feedback instead of a
 * round-trip and a toast.
 */
function validate(form: FormState, questions: readonly JobQuestion[]): FieldErrors {
  const errors: FieldErrors = {};

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'البريد الإلكتروني غير صالح';
  }

  // Shared with /jobs/profile so both surfaces accept exactly the same URLs.
  if (!isValidHttpUrl(form.resumeUrl)) {
    errors.resumeUrl = jobsStrings.invalidUrl;
  }

  // The server accepts an application with missing required answers only to
  // reject it — blocking here gives the seeker the field-level error instead.
  const missing = findMissingRequiredAnswers(questions, form.answers);
  if (missing.length > 0) {
    errors.answers = Object.fromEntries(
      missing.map((id) => [id, jobsStrings.answerRequired])
    );
  }

  return errors;
}

/**
 * Apply entry point.
 *
 * Owns auth, data loading and the redirect, then hands a settled world to
 * ApplyForm so the form can mount already prefilled.
 */
export default function JobApplyPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: job, isLoading, isError, refetch } = useJob(jobId);
  // Profile runs in parallel with the job fetch; it feeds the prefill (email,
  // phone, and the device-local CV link) that the form starts with.
  const { profile, isLoading: profileLoading } = useProfileData();

  // Applying requires an account; bounce to login while preserving the
  // destination so the user lands back on this form.
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(`/jobs/${jobId}/apply`)}`);
    }
  }, [authLoading, isAuthenticated, jobId, router]);

  // Waiting for the profile here — not later — is what lets the form mount
  // already filled: a warm query cache (the usual case when arriving from the
  // dashboard) costs nothing, a cold one costs one parallel request. Patching
  // the fields from an effect afterwards would flicker empty→filled and could
  // overwrite whatever the user had already started typing.
  if (isLoading || authLoading || profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Anonymous visitors get redirected to /login by the effect above, but
  // without an early return the form would render for a frame first.
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !job) {
    return <JobsErrorState onRetry={() => refetch()} />;
  }

  return (
    <ApplyForm job={job} jobId={jobId} prefill={prefillApplyForm(profile, loadResumeUrl())} />
  );
}

/**
 * The two-step form itself.
 *
 * Mounts only after the profile query has settled, so `form` is *born* at its
 * prefill value — no effect patches it afterwards (the lint rules forbid that,
 * and it would race whatever the user had already started typing).
 */
function ApplyForm({
  job,
  jobId,
  prefill,
}: {
  job: Job;
  jobId: string;
  prefill: ApplyPrefill;
}) {
  const apply = useApplyToJob();

  // The posting's screening questions, in the employer's stored order. Empty
  // for most jobs — the sections below render only when there is something
  // to ask.
  const questions = job.questions ?? [];

  const [step, setStep] = React.useState<Step>('details');
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(() => ({
    email: prefill.email,
    phone: prefill.phone,
    resumeUrl: prefill.resumeUrl,
    coverLetter: '',
    answers: {},
  }));
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const setAnswer = (id: string, value: string) =>
    setForm((current) => ({
      ...current,
      answers: { ...current.answers, [id]: value },
    }));

  // Success state — the application id is the anchor to the tracking page.
  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </span>
          <h1 className="text-lg font-semibold">{jobsStrings.applySuccess}</h1>
          <p className="text-sm text-muted-foreground">{job.title}</p>
          <div className="flex gap-2 pt-2">
            <Button asChild size="sm">
              <Link href={`/jobs/applications/${submitted}`}>{jobsStrings.viewApplication}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/jobs/search">{jobsStrings.browseAll}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // A job can close between the detail page and this form; refuse rather than
  // letting the user fill in a form that can only fail on submit.
  if (!job.isApplyOpen || job.hasApplied) {
    return (
      <JobsErrorState
        title={job.hasApplied ? jobsStrings.alreadyApplied : jobsStrings.applyClosed}
        body={
          job.hasApplied
            ? 'لقد قدّمت على هذه الوظيفة بالفعل.'
            : 'لم تعد هذه الوظيفة تستقبل طلبات التوظيف.'
        }
      />
    );
  }

  const handleContinue = () => {
    const found = validate(form, questions);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep('review');
  };

  const handleSubmit = () => {
    // Stray ids (e.g. a question the employer deleted while this form was
    // open) are dropped here rather than stored as unanswerable orphans.
    const answers = collectAnswers(questions, form.answers);
    apply.mutate(
      {
        jobId: job.id,
        input: {
          email: form.email || undefined,
          phone: form.phone || undefined,
          resumeUrl: form.resumeUrl || undefined,
          coverLetter: form.coverLetter || undefined,
          answers: Object.keys(answers).length > 0 ? answers : undefined,
        },
      },
      {
        onSuccess: (data) => setSubmitted(data?.application?.id ?? ''),
      }
    );
  };

  // The mutation error is normally an ApiError whose .message carries the
  // backend's Arabic message (e.g. "You have already applied to this job").
  // Narrow with instanceof before reading it: transport failures reject with
  // plain Error subclasses (TimeoutError / NetworkError / CallerAbortError)
  // whose .message is English technical text — those must fall through to the
  // Arabic fallback instead of being shown to an Arabic user verbatim.
  const serverError = apply.isError
    ? apply.error instanceof ApiError
      ? apply.error.message
      : 'تعذّر إرسال الطلب. حاول مرة أخرى.'
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{jobsStrings.applyTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {job.title}
          {job.company ? ` — ${job.company.name}` : ''}
        </p>
      </header>

      {/* Compact two-step progress; the same control works on mobile. */}
      <ol className="flex items-center gap-2 text-sm" aria-label="خطوات التقديم">
        {(['details', 'review'] as Step[]).map((value, index) => {
          const active = step === value;
          const done = step === 'review' && value === 'details';
          return (
            <li key={value} className="flex items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={
                  active || done
                    ? 'flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground'
                    : 'flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground'
                }
              >
                {index + 1}
              </span>
              <span className={active ? 'font-medium' : 'text-muted-foreground'}>
                {value === 'details' ? jobsStrings.contactInfo : jobsStrings.review}
              </span>
              {index === 0 ? <span className="mx-1 text-muted-foreground">—</span> : null}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="space-y-4 p-4">
          {step === 'details' ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="apply-email">{jobsStrings.email}</Label>
                <Input
                  id="apply-email"
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'apply-email-error' : undefined}
                />
                {errors.email ? (
                  <p id="apply-email-error" className="text-xs text-destructive">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apply-phone">{jobsStrings.phone}</Label>
                <Input
                  id="apply-phone"
                  type="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apply-resume">{jobsStrings.resumeUrl}</Label>
                <Input
                  id="apply-resume"
                  type="url"
                  dir="ltr"
                  placeholder="https://"
                  value={form.resumeUrl}
                  onChange={(event) => setForm({ ...form, resumeUrl: event.target.value })}
                  aria-invalid={!!errors.resumeUrl}
                  aria-describedby={errors.resumeUrl ? 'apply-resume-error' : undefined}
                />
                {errors.resumeUrl ? (
                  <p id="apply-resume-error" className="text-xs text-destructive">
                    {errors.resumeUrl}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apply-cover">{jobsStrings.coverLetter}</Label>
                <Textarea
                  id="apply-cover"
                  rows={6}
                  maxLength={COVER_LETTER_MAX}
                  value={form.coverLetter}
                  onChange={(event) => setForm({ ...form, coverLetter: event.target.value })}
                />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {form.coverLetter.length.toLocaleString('ar-EG')} /{' '}
                  {COVER_LETTER_MAX.toLocaleString('ar-EG')}
                </p>
              </div>

              {questions.length > 0 ? (
                <fieldset className="space-y-3 border-t pt-4">
                  <legend className="px-0 text-sm font-medium">
                    {jobsStrings.screeningQuestions}
                  </legend>
                  {questions.map((question) => (
                    <div key={question.id} className="space-y-1.5">
                      <Label htmlFor={`apply-answer-${question.id}`}>
                        {question.prompt}{' '}
                        <span className="text-xs text-muted-foreground">
                          (
                          {question.required
                            ? jobsStrings.questionRequired
                            : jobsStrings.questionOptional}
                          )
                        </span>
                      </Label>
                      <Textarea
                        id={`apply-answer-${question.id}`}
                        rows={3}
                        value={form.answers[question.id] ?? ''}
                        aria-invalid={!!errors.answers?.[question.id]}
                        aria-describedby={
                          errors.answers?.[question.id]
                            ? `apply-answer-${question.id}-error`
                            : undefined
                        }
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                      />
                      {errors.answers?.[question.id] ? (
                        <p
                          id={`apply-answer-${question.id}-error`}
                          className="text-xs text-destructive"
                        >
                          {errors.answers[question.id]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </fieldset>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link href={`/jobs/${jobId}`}>{jobsStrings.cancel}</Link>
                </Button>
                <Button onClick={handleContinue}>{jobsStrings.next}</Button>
              </div>
            </>
          ) : (
            <>
              <dl className="space-y-3 text-sm">
                {[
                  [jobsStrings.email, form.email],
                  [jobsStrings.phone, form.phone],
                  [jobsStrings.resumeUrl, form.resumeUrl],
                  [jobsStrings.coverLetter, form.coverLetter],
                ].map(([label, value]) => (
                  <div key={label} className="border-b pb-2 last:border-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="whitespace-pre-line break-words">
                      {value || <span className="text-muted-foreground">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>

              {questions.length > 0 ? (
                <dl className="space-y-3 text-sm">
                  {questions.map((question) => (
                    <div key={question.id} className="border-b pb-2 last:border-0">
                      <dt className="text-xs text-muted-foreground">
                        {question.prompt}
                      </dt>
                      <dd className="whitespace-pre-line break-words">
                        {(form.answers[question.id] ?? '').trim() || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {serverError ? (
                <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {serverError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep('details')} disabled={apply.isPending}>
                  {jobsStrings.back}
                </Button>
                <Button onClick={handleSubmit} disabled={apply.isPending} className="gap-2">
                  {apply.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {jobsStrings.submitting}
                    </>
                  ) : (
                    jobsStrings.submit
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
