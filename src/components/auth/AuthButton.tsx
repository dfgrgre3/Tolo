'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingLabel?: string;
}

export function AuthButton({ loading, loadingLabel, children, ...props }: AuthButtonProps) {
  return (
    <Button {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {loadingLabel ?? 'جاري التنفيذ'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
