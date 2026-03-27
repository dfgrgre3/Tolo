'use client';

import ErrorBoundary from '../error-boundary';

/**
 * Standard UI ErrorBoundary for components.
 * Defaults to 'component' variant for localized error handling.
 */
export const ComponentErrorBoundary = (props: React.ComponentProps<typeof ErrorBoundary>) => (
  <ErrorBoundary variant="component" {...props} />
);

export default ErrorBoundary;
