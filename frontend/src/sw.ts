// Service worker needs to exclude /__clerk/ paths
// This file doesn't exist yet, but you need to add this exclusion
// In your sw.js or service worker registration:
// 
// self.addEventListener('fetch', (event) => {
//   const url = new URL(event.request.url);
//   if (url.pathname.startsWith('/__clerk/')) {
//     return; // Do NOT intercept Clerk API requests
//   }
//   // ... rest of service worker logic
// });