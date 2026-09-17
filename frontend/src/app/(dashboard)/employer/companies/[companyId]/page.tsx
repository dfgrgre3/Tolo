'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateCompany,
  useUpdateCompany,
} from '@/hooks/use-employer-jobs';
import { jobsStrings } from '@/features/jobs/labels';

/**
 * Company create/edit form.
 *
 * IsVerified is intentionally absent from this form: it is admin-controlled
 * only, and the payload type the backend accepts excludes it, so the form
 * cannot submit it even by accident.
 */
export default function CompanyFormPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = React.use(params);
  const isCreating = companyId === 'new';
  const router = useRouter();

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const [values, setValues] = React.useState({
    name: '',
    description: '',
    industry: '',
    location: '',
    website: '',
  });

  const submitting = createCompany.isPending || updateCompany.isPending;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">
        {isCreating ? jobsStrings.addCompany : jobsStrings.saveCompany}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{jobsStrings.companyName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{jobsStrings.companyName}</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) =>
                setValues((s) => ({ ...s, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{jobsStrings.companyDescription}</Label>
            <Textarea
              id="description"
              rows={5}
              value={values.description}
              onChange={(e) =>
                setValues((s) => ({ ...s, description: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">{jobsStrings.companyIndustry}</Label>
              <Input
                id="industry"
                value={values.industry}
                onChange={(e) =>
                  setValues((s) => ({ ...s, industry: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{jobsStrings.companyLocation}</Label>
              <Input
                id="location"
                value={values.location}
                onChange={(e) =>
                  setValues((s) => ({ ...s, location: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">{jobsStrings.companyWebsite}</Label>
            <Input
              id="website"
              type="url"
              value={values.website}
              onChange={(e) =>
                setValues((s) => ({ ...s, website: e.target.value }))
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/employer/companies')}
            >
              {jobsStrings.cancel}
            </Button>
            <Button
              disabled={submitting || !values.name.trim()}
              onClick={() => {
                const input = {
                  name: values.name.trim(),
                  description: values.description || undefined,
                  industry: values.industry || undefined,
                  location: values.location || undefined,
                  website: values.website || undefined,
                };

                if (isCreating) {
                  createCompany.mutate(input, {
                    onSuccess: () => {
                      toast.success(jobsStrings.saveCompany);
                      router.push('/employer/companies');
                    },
                    onError: () => toast.error(jobsStrings.transitionFailed),
                  });
                } else {
                  updateCompany.mutate(
                    { id: companyId, input },
                    {
                      onSuccess: () => {
                        toast.success(jobsStrings.saveCompany);
                        router.push('/employer/companies');
                      },
                      onError: () => toast.error(jobsStrings.transitionFailed),
                    },
                  );
                }
              }}
            >
              {submitting ? jobsStrings.saving : jobsStrings.saveCompany}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
