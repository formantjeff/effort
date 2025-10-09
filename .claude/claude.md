# Effort - Project Context

## Project Overview
Effort is a mobile-first web application for managing and visualizing team workstream allocations. Users can create multiple effort graphs, adjust workstream percentages with sliders, and view distributions in pie charts.

### Terminology
- **Effort**: A pairing of a pie chart visualization and workstream sliders. The pie chart appears first (above/before the sliders in the layout).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link)
- **Deployment**: Vercel

## Design Principles

### Mobile-First
- **Always design for mobile screens first**, then scale up to larger screens
- Use responsive grid layouts that adapt to screen size
- Prioritize touch-friendly interactions (larger tap targets, swipe gestures)
- Keep interfaces simple and focused on one task at a time on mobile
- Use vertical scrolling over horizontal when possible
- Test on actual mobile viewports (320px+, 375px, 414px)

### Component Usage
- **Always use shadcn/ui components when available** before creating custom components
- Available shadcn/ui components in this project:
  - `Button` - All button interactions
  - `Card`, `CardHeader`, `CardTitle`, `CardContent` - Content containers
  - `Input` - Text inputs
  - `Label` - Form labels
  - `Slider` - Range inputs
- Install additional shadcn/ui components as needed: `npx shadcn@latest add <component>`
- Custom components should be created in `/components` directory
- UI primitives go in `/components/ui`

## Code Style
- Use TypeScript with strict mode enabled
- Follow Next.js 15 conventions (App Router, Server/Client Components)
- Use `'use client'` directive for client components
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any` when possible)
- Add `// eslint-disable-next-line` comments only when necessary

## Database Schema

### Tables
1. **effort_graphs**
   - id (uuid, primary key)
   - name (text)
   - description (text, nullable)
   - author_id (uuid, references auth.users)
   - created_at, updated_at (timestamps)

2. **workstreams**
   - id (uuid, primary key)
   - name (text)
   - effort (numeric, 0-100)
   - color (text, hex color)
   - graph_id (uuid, references effort_graphs)
   - created_at, updated_at (timestamps)

3. **graph_permissions**
   - id (uuid, primary key)
   - graph_id (uuid, references effort_graphs)
   - user_id (uuid, references auth.users)
   - permission_level (text: 'viewer' | 'editor')
   - created_at (timestamp)

### Row Level Security (RLS)
- Currently **disabled** for development
- TODO: Re-implement proper RLS policies without infinite recursion

## Authentication
- Magic link authentication via Supabase Auth
- No passwords required
- Email-based one-time login links
- Redirect URL configured for production: https://effort-ten.vercel.app

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- Both set in Vercel deployment and `.env.local` for development

## Known Issues & TODOs
- [ ] RLS policies temporarily disabled (see migration `20251007203000_disable_rls_temporarily.sql`)
- [ ] Permission sharing UI not yet implemented (backend foundation exists)
- [ ] Mobile-first redesign: graph tiles in grid layout (mentioned but not implemented)
- [ ] **URGENT**: Run storage migration in Supabase SQL Editor for Slack chart images to work
  - Migration file: `supabase/migrations/20251009000002_create_chart_storage.sql`
  - This creates the `effort-charts` bucket for storing chart images
  - Required for inline chart display in Slack integration

## Development Commands
```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build (without Turbopack)
npm start            # Start production server
npm run lint         # Run ESLint
supabase db push     # Push migrations to remote Supabase
```

## Deployment
- **Platform**: Vercel
- **Framework Preset**: Must be set to "Next.js" (not "Other")
- **Node.js Version**: 22.x
- **Build Command**: `npm run build` (no `--turbopack` flag)
- **Production URL**: https://effort-ten.vercel.app

## File Structure
```
/app
  /api           # API routes
  layout.tsx     # Root layout (with AuthProvider)
  page.tsx       # Main dashboard page

/components
  /ui            # shadcn/ui components
  auth-provider.tsx
  auth-gate.tsx
  graph-selector.tsx
  workstream-slider.tsx
  effort-pie-chart.tsx

/lib
  supabase.ts           # Type definitions
  supabase-browser.ts   # Browser client
  utils.ts              # Utilities (cn helper)

/supabase
  /migrations    # Database migrations
  config.toml    # Supabase config
```

## Important Notes
- Dynamic rendering is forced at layout level (`export const dynamic = 'force-dynamic'`)
- Local Supabase setup exists but production uses hosted Supabase
- Build must succeed on Vercel before deployment goes live
