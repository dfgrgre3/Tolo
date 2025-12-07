# Design System Refactoring Plan

## Objective
Refactor the entire website's component design to ensure consistency, remove hardcoded styles, and unify the design system using Tailwind CSS and Semantic Tokens (Shadcn UI style).

## Current State Analysis
- **Inconsistent Colors**: Many components use hardcoded Tailwind colors (e.g., `bg-indigo-500`, `text-slate-300`) instead of semantic tokens (e.g., `bg-primary`, `text-muted-foreground`).
- **Mixed Styling**: Presence of CSS Modules (`.module.css`) alongside Tailwind CSS.
- **Backend Disconnect**: Email templates use inline styles with hardcoded colors that may not match the frontend theme.

## Refactoring Roadmap

### Phase 1: Foundation & Configuration 
- [x] Verify `tailwind.config.js` and `globals.css` for completeness of semantic tokens.
- [x] Define color mapping strategy (e.g., Indigo -> Primary).

### Phase 2: UI Components (Base)
- [x] Audit `src/components/ui` for any hardcoded values. (Generally clean)

### Phase 3: Feature Components Refactoring
#### Auth Components
- [x] `src/components/auth/passkeys/PasskeyManagement.tsx`
- [x] `src/components/auth/login/LoginCredentialsStep.tsx`
- [x] `src/components/auth/register/RegistrationAccountStep.tsx`

#### Dashboard & Home
- [ ] `src/components/home/UserHome.tsx`
- [x] `src/components/Dashboard.module.css` -> Convert to Tailwind (Deleted/Unused)
- [x] `src/components/time/Reminders.module.css` -> Convert to Tailwind (Deleted/Unused)
- [x] `src/components/time/StudySessionsHistory.module.css` -> Convert to Tailwind
- [x] `src/components/time/WeeklySchedule/styles.module.css` -> Convert to Tailwind

### Phase 4: Email Templates
- [ ] Refactor `src/lib/services/email-service.ts` to use a centralized theme configuration or constants that match the frontend.

## Color Mapping Guide

| Hardcoded Color | Semantic Token | Tailwind Class |
|-----------------|----------------|----------------|
| `bg-indigo-500` | Primary | `bg-primary` |
| `bg-indigo-600` | Primary Hover | `hover:bg-primary/90` |
| `text-indigo-400` | Primary (Foreground context) | `text-primary` |
| `bg-slate-900` | Card / Popover | `bg-card` / `bg-popover` |
| `text-slate-300` | Muted Foreground | `text-muted-foreground` |
| `bg-red-500` | Destructive | `bg-destructive` |
| `text-red-400` | Destructive Foreground | `text-destructive` |
| `bg-white/5` | Muted / Accent | `bg-muted` or `bg-accent` |
