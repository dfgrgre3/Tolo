'use client';

import React from 'react';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Example component demonstrating how to solve server-client synchronization issues
 * when accessing localStorage in Next.js applications.
 */
export default function ServerClientSyncExample() {
  // Using our custom hook to safely manage state with localStorage persistence
  const [userName, setUserName] = useLocalStorageState('example-user-name', 'Guest');
  const [darkMode, setDarkMode] = useLocalStorageState('example-dark-mode', false);
  const [notifications, setNotifications] = useLocalStorageState('example-notifications', true);
  const [language, setLanguage] = useLocalStorageState('example-language', 'ar');
  const [counter, setCounter] = useLocalStorageState('example-counter', 0);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Server-Client Synchronization Solution</CardTitle>
          <CardDescription>
            This example demonstrates how to safely access localStorage in Next.js applications
            without causing server-client hydration mismatches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="user" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="user">User Settings</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="counter">Counter</TabsTrigger>
            </TabsList>
            
            <TabsContent value="user" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="username">User Name</Label>
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
            </TabsContent>
            
            <TabsContent value="preferences" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notifications</Label>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Language</Label>
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
              </div>
            </TabsContent>
            
            <TabsContent value="counter" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-lg font-medium">Counter Value:</span>
                <span className="text-2xl font-bold">{counter}</span>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => setCounter(c => c + 1)}>
                  Increment
                </Button>
                <Button variant="outline" onClick={() => setCounter(c => c - 1)}>
                  Decrement
                </Button>
                <Button variant="destructive" onClick={() => setCounter(0)}>
                  Reset
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                setUserName('Guest');
                setDarkMode(false);
                setNotifications(true);
                setLanguage('ar');
                setCounter(0);
              }}
            >
              Reset All Settings
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            The <code className="bg-muted px-1 rounded">useLocalStorageState</code> hook solves the server-client 
            synchronization issue by:
          </p>
          
          <ol className="list-decimal list-inside space-y-2">
            <li>Using the same initial value on both server and client during the first render</li>
            <li>Only accessing localStorage after the component has mounted on the client</li>
            <li>Updating the state with the actual localStorage value after hydration</li>
            <li>Ensuring no content mismatch between server and client renders</li>
          </ol>
          
          <p>
            This approach prevents the React hydration mismatch error that occurs when components 
            try to access browser-specific APIs like localStorage during server-side rendering.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}