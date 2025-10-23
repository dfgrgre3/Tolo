'use client';

import React from 'react';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Example component demonstrating how to use the useLocalStorageState hook
 * to solve server-client synchronization issues.
 */
export default function LocalStorageExample() {
  // Using our custom hook to safely manage state with localStorage persistence
  const [userName, setUserName] = useLocalStorageState('user-name', 'Guest');
  const [darkMode, setDarkMode] = useLocalStorageState('dark-mode', false);
  const [language, setLanguage] = useLocalStorageState('language', 'ar');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Server-Client Sync Example</CardTitle>
        <CardDescription>
          This component demonstrates safe localStorage usage with server-client synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            User Name
          </label>
          <Input
            id="username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
          />
          <p className="text-sm text-muted-foreground">
            Current user: {userName}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Theme Preference
          </label>
          <div className="flex items-center space-x-2">
            <Button
              variant={darkMode ? 'default' : 'outline'}
              onClick={() => setDarkMode(true)}
            >
              Dark
            </Button>
            <Button
              variant={!darkMode ? 'default' : 'outline'}
              onClick={() => setDarkMode(false)}
            >
              Light
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Theme: {darkMode ? 'Dark' : 'Light'} mode
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Language
          </label>
          <div className="flex space-x-2">
            <Button
              variant={language === 'ar' ? 'default' : 'outline'}
              onClick={() => setLanguage('ar')}
            >
              Arabic
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              onClick={() => setLanguage('en')}
            >
              English
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Selected language: {language}
          </p>
        </div>

        <div className="pt-4">
          <Button
            variant="destructive"
            onClick={() => {
              setUserName('Guest');
              setDarkMode(false);
              setLanguage('ar');
            }}
          >
            Reset All Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}