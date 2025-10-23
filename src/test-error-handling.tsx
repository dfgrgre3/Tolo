/**
 * Simple test file to verify error handling system works
 * This file can be imported and used to test the error handling components
 */

import React from 'react';
import errorManager from './services/ErrorManager';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPage from './components/ErrorPages';

// Test component that throws an error
const ErrorThrowingComponent: React.FC = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('Test error from ErrorThrowingComponent');
  }

  return (
    <div>
      <h2>Test Error Component</h2>
      <button onClick={() => setShouldThrow(true)}>
        Throw Error
      </button>
      <button onClick={() => errorManager.handleError('Test error from button')}>
        Test Error Manager
      </button>
      <button onClick={() => errorManager.handleNetworkError('Network test error', '/api/test')}>
        Test Network Error
      </button>
    </div>
  );
};

// Test ErrorBoundary with custom error page
export const TestErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary
      showErrorPage={true}
      errorType="server"
      showDetails={true}
    >
      <ErrorThrowingComponent />
    </ErrorBoundary>
  );
};

// Test individual error pages
export const TestErrorPages: React.FC = () => {
  const [currentError, setCurrentError] = React.useState<string | null>(null);

  const showErrorPage = (type: string) => {
    setCurrentError(type);
  };

  if (currentError) {
    return (
      <ErrorPage
        type={currentError as any}
        errorId={`test-${Date.now()}`}
        showDetails={true}
        onGoBack={() => setCurrentError(null)}
      />
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Error Pages Test</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => showErrorPage('network')}
          className="p-4 bg-blue-100 hover:bg-blue-200 rounded-lg"
        >
          Network Error
        </button>
        <button
          onClick={() => showErrorPage('auth')}
          className="p-4 bg-red-100 hover:bg-red-200 rounded-lg"
        >
          Auth Error
        </button>
        <button
          onClick={() => showErrorPage('permission')}
          className="p-4 bg-orange-100 hover:bg-orange-200 rounded-lg"
        >
          Permission Error
        </button>
        <button
          onClick={() => showErrorPage('not-found')}
          className="p-4 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Not Found
        </button>
        <button
          onClick={() => showErrorPage('server')}
          className="p-4 bg-red-100 hover:bg-red-200 rounded-lg"
        >
          Server Error
        </button>
        <button
          onClick={() => showErrorPage('validation')}
          className="p-4 bg-yellow-100 hover:bg-yellow-200 rounded-lg"
        >
          Validation Error
        </button>
        <button
          onClick={() => showErrorPage('timeout')}
          className="p-4 bg-orange-100 hover:bg-orange-200 rounded-lg"
        >
          Timeout Error
        </button>
        <button
          onClick={() => showErrorPage('generic')}
          className="p-4 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Generic Error
        </button>
      </div>
    </div>
  );
};

// Export test functions
export const testErrorManager = () => {
  console.log('Testing ErrorManager...');

  // Test basic error handling
  const errorId1 = errorManager.handleError('Test error');
  console.log('Basic error logged with ID:', errorId1);

  // Test network error
  const errorId2 = errorManager.handleNetworkError('Network failed', '/api/test');
  console.log('Network error logged with ID:', errorId2);

  // Test auth error
  const errorId3 = errorManager.handleAuthError('Session expired');
  console.log('Auth error logged with ID:', errorId3);

  // Test validation error
  const errorId4 = errorManager.handleValidationError('Invalid input');
  console.log('Validation error logged with ID:', errorId4);

  // Test permission error
  const errorId5 = errorManager.handlePermissionError('admin');
  console.log('Permission error logged with ID:', errorId5);

  // Get error stats
  const stats = errorManager.getErrorStats();
  console.log('Error stats:', stats);

  return { errorId1, errorId2, errorId3, errorId4, errorId5, stats };
};

export default {
  TestErrorBoundary,
  TestErrorPages,
  testErrorManager,
};
