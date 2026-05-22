"use client";

import ErrorPage from "@/components/error-pages";

export default function NotFound() {
  return (
    <ErrorPage
      type="not-found"
      onGoHome={() => { window.location.href = "/"; }}
      onGoBack={() => { window.history.back(); }}
    />
  );
}
