# Effort - Development Notes

## Project Overview
Effort tracking app with Supabase backend, Next.js frontend, and Slack integration.

## Tech Stack
- **Framework**: Next.js 15.5.4 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, magic links)
- **Styling**: Tailwind CSS + Shadcn UI
- **Animations**: Framer Motion
- **Deployment**: Vercel
- **Integration**: Slack App

## Key Features
- Create and manage effort allocations across workstreams
- Visual pie chart representation
- Share efforts publicly with view tracking
- Dark/light theme with database persistence
- Swipe navigation between efforts
- Slack integration for viewing and sharing efforts with inline chart images
- Server-side chart generation using Canvas and ChartJS
- Supabase Storage for cached chart images

## Environment Variables

### Local (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase dashboard>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard - service_role key>

# Slack App Credentials (from Slack app settings)
SLACK_CLIENT_ID=<from Slack app OAuth settings>
SLACK_CLIENT_SECRET=<from Slack app OAuth settings>
SLACK_SIGNING_SECRET=<from Slack app Basic Information>
SLACK_BOT_TOKEN=<from Slack app OAuth & Permissions>
```

**Note**: Actual values are in `.env.local` (not committed to git)

### Vercel Environment Variables
Same as above - make sure all are added to Vercel project settings.

## Database Schema

### Tables
- `effort_graphs` - Main effort allocations (owner: user)
- `workstreams` - Individual workstreams within an effort
- `shared_efforts` - Public share links with view tracking (includes slack_view_count, web_view_count)
- `effort_view_logs` - Detailed view tracking by source (slack/web)
- `graph_permissions` - Shared access permissions
- `user_preferences` - User settings (theme)
- `slack_users` - Links Slack accounts to app users

### Storage Buckets
- `effort-charts` - Public bucket for cached chart PNG images (organized by userId/graphId-theme.png)

### Key Relationships
- `effort_graphs.author_id` → `auth.users.id`
- `workstreams.graph_id` → `effort_graphs.id`
- `shared_efforts.graph_id` → `effort_graphs.id`
- `slack_users.user_id` → `auth.users.id`

## Slack Integration

### App Configuration
- **App ID**: A09KBNS17DZ
- **Workspace**: Formant

### Endpoints
- `/api/slack/commands` - Handles `/effort` slash commands
- `/api/slack/link` - Account linking flow
- `/api/slack/events` - Event subscriptions
- `/api/slack/interactive` - Button/modal interactions
- `/api/chart/[graphId]` - Generates chart PNG and uploads to Supabase Storage, returns redirect to public URL
- `/api/chart/invalidate` - Clears cached chart images when workstream data changes

### Commands
- `/effort list` - List all user's efforts
- `/effort view [name]` - View specific effort details
- `/effort share [name]` - Share effort to channel
- `/effort link` - Check link status
- `/effort help` - Show help message

### User Linking Flow
1. User runs `/effort` command in Slack
2. If not linked, shows "Link Account" button
3. Button redirects to Effort app
4. If logged in → link created immediately
5. If not logged in → cookie stored, link created after login

### Important Notes
- Slack commands use service role client (bypasses RLS)
- User linking stored in `slack_users` table
- Slack user ID + team ID used for linking
- Charts are rendered server-side using `chartjs-node-canvas` and stored in Supabase Storage
- Charts respect user's theme preference from web app (not Slack theme)
- Chart cache automatically invalidated when workstreams are added/updated/deleted

## Development Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Slack workspace (for integration)

### Getting Started
```bash
npm install
npm run dev
```

### Migrations
Migrations are in `supabase/migrations/`. To apply:
1. Go to Supabase SQL Editor
2. Copy migration contents
3. Run the SQL

Or use Supabase CLI:
```bash
supabase db push
```

### Recent Migrations (Pending)
- `20251009000001_add_view_tracking.sql` - Adds view tracking columns and effort_view_logs table
- `20251009000002_create_chart_storage.sql` - Creates effort-charts storage bucket with RLS policies

**Action Required**: Run these migrations in Supabase before deploying to production

## Key Files

### Components
- `components/effort-pie-chart.tsx` - Main chart visualization with share
- `components/workstream-slider.tsx` - Effort allocation sliders
- `components/effort-card.tsx` - Effort card in library view
- `components/auth-gate.tsx` - Auth wrapper
- `components/auth-provider.tsx` - Auth context

### API Routes
- `app/api/slack/*` - Slack integration endpoints
- `app/api/share/[token]/route.ts` - Share link handler
- `app/api/chart/[graphId]/route.ts` - Chart image generation and storage
- `app/api/chart/invalidate/route.ts` - Chart cache invalidation

### Lib
- `lib/supabase.ts` - Supabase client + TypeScript types
- `lib/supabase-server.ts` - Server-side Supabase client
- `lib/supabase-service.ts` - Service role client (bypasses RLS)
- `lib/supabase-browser.ts` - Browser Supabase client
- `lib/slack.ts` - Slack utility functions and Block Kit builders

## Common Issues

### Slack Commands Not Working
- Check service role key is set in Vercel
- Verify Slack URLs match deployed endpoints
- Check Vercel logs for errors

### RLS Errors
- Server routes use `createClient()` from `supabase-server`
- Slack routes use `createServiceClient()` from `supabase-service`
- Browser code uses `createClient()` from `supabase-browser`

### Theme Not Persisting
- Check `user_preferences` table exists
- Verify RLS policies allow user to update their preferences

### Chart Images Not Showing in Slack
- Verify storage bucket `effort-charts` exists and is public
- Check migration `20251009000002_create_chart_storage.sql` has been run
- Verify RLS policies on storage.objects allow public read
- Check Vercel logs for chart generation errors
- Canvas library requires native dependencies - may need Vercel build configuration

## Deployment

### Vercel
- Connected to GitHub repo: formantjeff/effort
- Auto-deploys on push to main
- Production URL: https://effort-ten.vercel.app

### Environment Variables Required
All variables from `.env.local` must be in Vercel environment settings.

## Git Workflow
```bash
git add .
git commit -m "Your message"
git push
```
Vercel will automatically build and deploy.

## Switching Development Environments
When moving to a new machine:
1. Clone the repo
2. Run `npm install`
3. Copy `.env.local` from this file or previous environment
4. Run `npm run dev`
5. Verify Supabase connection works
6. Test Slack integration (will use production endpoints)
