# Server-Client Synchronization in Next.js

## The Problem

When using Next.js, the initial HTML is generated on the server and then hydrated on the client. This process can cause mismatches when components try to access browser-specific APIs like `localStorage` during server-side rendering, since these APIs don't exist on the server.

This typically results in errors like:
```
Warning: Text content did not match. Server: "default" Client: "actual value"
```

## The Solution

We've created custom hooks to handle this issue properly:

1. `useLocalStorageState` - For managing state that should be persisted in localStorage
2. `useLocalStorageValue` - For reading values from localStorage

These hooks ensure that:
1. The same initial content is rendered on both server and client
2. localStorage is only accessed after the component has mounted on the client
3. State updates are synchronized with localStorage

## Usage Examples

### Using useLocalStorageState

```tsx
'use client';

import { useLocalStorageState } from '@/hooks/use-local-storage-state';

export default function MyComponent() {
  // This will use "defaultValue" on the server and initial render
  // Then switch to the actual localStorage value after hydration
  const [value, setValue] = useLocalStorageState('my-key', 'defaultValue');
  
  return (
    <div>
      <p>Current value: {value}</p>
      <button onClick={() => setValue('new value')}>
        Update Value
      </button>
    </div>
  );
}
```

### Using useLocalStorageValue

```tsx
'use client';

import { useLocalStorageValue } from '@/hooks/use-local-storage-state';

export default function MyComponent() {
  // This will use "defaultValue" on the server and initial render
  // Then switch to the actual localStorage value after hydration
  const value = useLocalStorageValue('my-key', 'defaultValue');
  
  return (
    <div>
      <p>Current value: {value}</p>
    </div>
  );
}
```

## How It Works

1. The hooks use React's `useState` with an initial value that matches what the server would render
2. They use `useEffect` to detect when the component has mounted on the client
3. Only after mounting do they access localStorage and update the state if needed
4. This ensures the initial render matches between server and client

## Best Practices

1. Always use these hooks when accessing localStorage in components that might render on the server
2. Make sure the initial value matches what would be rendered on the server
3. Wrap components using these hooks with the `'use client'` directive
4. Consider using default/fallback UI states during the initial render