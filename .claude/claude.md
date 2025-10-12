# Effort - Project Context

## Project Overview
Effort is a mobile-first web application for managing and visualizing team workstream allocations. Users can create multiple effort graphs, adjust workstream percentages with sliders, and view distributions in pie charts. The app integrates with Slack for sharing visualizations and will support creating efforts directly from Slack.

### Terminology
- **Effort**: A named collection of workstreams with a visualization. The pie chart appears first (above/before the sliders in the layout).
- **Workstream**: An individual allocation item with a name, percentage (effort), and color.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Charts**: Recharts (for web app visualizations)
- **Chart Rendering**: Puppeteer + @sparticuz/chromium (for Slack image generation)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for cached chart images)
- **Authentication**: Supabase Auth (Magic Link)
- **Deployment**: Vercel
- **Integration**: Slack API (slash commands, Block Kit)

## Architecture

### Web Application Flow
```
User → Web App (Next.js) → Supabase (Database + Auth)
                         ↓
                    Recharts (Interactive visualization)
```

### Slack Integration Flow
```
Slack User → /effort command → API Route → Database
                                         ↓
                            Render Page (Recharts component)
                                         ↓
                            Puppeteer Screenshot
                                         ↓
                            Supabase Storage (cached PNG)
                                         ↓
                            Slack (inline image)
```

### Key Architectural Patterns

#### 1. Shared Visualization Components
- **Pattern**: Single source of truth for chart rendering
- **Location**: `/app/render/[graphId]/chart-renderer.tsx`
- **Purpose**: Ensures web app and Slack images are identical
- **Usage**:
  - Web app: Renders directly via Recharts
  - Slack: Puppeteer screenshots this component
  - Future visualizations: Must be added here to appear in both web and Slack

#### 2. Server-Side Screenshot Generation
- **Endpoint**: `/app/api/chart/screenshot/route.ts`
- **Process**:
  1. Receives request with `graphId`, `userId`, `theme`
  2. Checks Supabase Storage for cached image
  3. If missing or `refresh=true`: launches Puppeteer
  4. Navigates to `/render/[graphId]` page
  5. Takes 800x800px screenshot
  6. Uploads to Supabase Storage bucket `effort-charts`
  7. Returns public URL
- **Caching**:
  - Filename: `{userId}/{graphId}-{theme}.png`
  - Cache-Control: 300 seconds
  - Invalidated when user closes edit mode

#### 3. Slack Command Handler
- **Endpoint**: `/app/api/slack/commands/route.ts`
- **Commands**:
  - `/effort` - Show quick list of efforts
  - `/effort view [name]` - Display specific effort with inline chart
  - `/effort share [name]` - Create shareable link
  - `/effort list` - Show detailed effort list
- **Response Format**: Slack Block Kit (JSON)
- **Image Inclusion**: Uses screenshot URL with timestamp for cache busting

#### 4. Data Flow for New Visualizations
When adding new visualization types:
1. **Update Database Schema**: Add visualization type field to `effort_graphs`
2. **Create Component**: Add to `/app/render/[graphId]/chart-renderer.tsx`
3. **Update Web UI**: Modify `/components/effort-pie-chart.tsx`
4. **No Slack Changes Needed**: Puppeteer automatically captures new visualization

## Design Principles

### Mobile-First
- **Always design for mobile screens first**, then scale up to larger screens
- Use responsive grid layouts that adapt to screen size
- Prioritize touch-friendly interactions (larger tap targets, swipe gestures)
- Keep interfaces simple and focused on one task at a time on mobile
- Use vertical scrolling over horizontal when possible
- Test on actual mobile viewports (320px+, 375px, 414px)
- **Swipe gestures**: Disabled in edit mode to prevent accidental navigation

### Component Usage
- **Always use shadcn/ui components when available** before creating custom components
- Available shadcn/ui components in this project:
  - `Button` - All button interactions
  - `Card`, `CardHeader`, `CardTitle`, `CardContent` - Content containers
  - `Input` - Text inputs (with `autoCapitalize="sentences"` for mobile)
  - `Label` - Form labels
  - `Slider` - Range inputs
- Install additional shadcn/ui components as needed: `npx shadcn@latest add <component>`
- Custom components should be created in `/components` directory
- UI primitives go in `/components/ui`

### Visualization Standards
- **Square Aspect Ratio**: All chart images are 800x800px
- **Full-Frame Rendering**: Minimal padding, chart fills available space
- **Text Sizing**:
  - Title: 35px
  - Pie chart labels: 25px bold
  - Legend: 25px medium weight
  - Tooltip: 22px/20px
- **Chart Size**: Pie chart outer radius at 75% of container
- **Theme Support**: Dark and light themes (user preference stored in database)

## Code Style
- Use TypeScript with strict mode enabled
- Follow Next.js 15 conventions (App Router, Server/Client Components)
- Use `'use client'` directive for client components
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any` when possible)
- Add `// eslint-disable-next-line` comments only when necessary
- **Slack API**: Always verify request signatures for security

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
   - effort (numeric, 0-100, raw values)
   - color (text, hex color)
   - graph_id (uuid, references effort_graphs)
   - created_at, updated_at (timestamps)
   - **Note**: Percentages are normalized to sum to 100% in display layer

3. **graph_permissions**
   - id (uuid, primary key)
   - graph_id (uuid, references effort_graphs)
   - user_id (uuid, references auth.users)
   - permission_level (text: 'viewer' | 'editor')
   - created_at (timestamp)

4. **user_preferences**
   - id (uuid, primary key)
   - user_id (uuid, references auth.users)
   - theme (text: 'light' | 'dark')
   - created_at, updated_at (timestamps)

5. **shared_efforts**
   - id (uuid, primary key)
   - graph_id (uuid, references effort_graphs)
   - share_token (text, unique)
   - is_active (boolean)
   - created_at (timestamp)

6. **slack_users**
   - id (uuid, primary key)
   - slack_user_id (text, unique)
   - user_id (uuid, references auth.users, nullable)
   - created_at, updated_at (timestamps)

### Storage Buckets
- **effort-charts**: Cached chart images
  - Path: `{userId}/{graphId}-{theme}.png`
  - Public access enabled
  - Cache-Control: 300 seconds

### Row Level Security (RLS)
- Currently **disabled** for development
- TODO: Re-implement proper RLS policies without infinite recursion

## Authentication

### Web App
- Magic link authentication via Supabase Auth
- No passwords required
- Email-based one-time login links
- Redirect URL configured for production: https://effort-ten.vercel.app

### Slack Integration
- OAuth-based user linking (planned)
- Slack user ID stored in `slack_users` table
- Associated with Supabase user account

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `SLACK_BOT_TOKEN` - Slack bot OAuth token
- `SLACK_SIGNING_SECRET` - For verifying Slack requests
- `SLACK_CLIENT_ID` - OAuth client ID
- `SLACK_CLIENT_SECRET` - OAuth client secret

### Development Only
- Set in `.env.local`
- Never commit `.env.local` to repository

## Slack Integration

### Setup
1. Create Slack App at api.slack.com
2. Enable Slash Commands:
   - `/effort` → `{VERCEL_URL}/api/slack/commands`
3. Set Bot Token Scopes:
   - `chat:write` - Post messages
   - `commands` - Receive slash commands
4. Install to workspace
5. Configure environment variables in Vercel

### Commands
- **`/effort`**: Quick effort overview
- **`/effort view [name]`**: Show effort with inline chart image
- **`/effort share [name]`**: Generate and post shareable link
- **`/effort list`**: Detailed list of all user's efforts

### Message Format
- **Blocks**: Slack Block Kit JSON
- **Images**: Inline via `image` block type
- **Cache Busting**: Timestamp parameter in image URL
- **No Header Block**: App name "Effort" serves as title

### Future Slack Features (Planned)
- **Create from Slack**: `/effort create [name]` with interactive workstream builder
- **Edit from Slack**: Interactive sliders in Slack modals
- **Real-time Sync**: Changes in Slack reflect immediately in web app
- **User Linking**: OAuth flow to connect Slack and web app accounts

## Known Issues & TODOs

### Current
- [ ] RLS policies temporarily disabled
- [ ] Slack OAuth user linking not implemented
- [ ] Create efforts from Slack not yet available

### Future Enhancements
- [ ] Multiple visualization types (bar charts, timelines, etc.)
- [ ] Real-time collaboration
- [ ] Export to PDF
- [ ] Slack notifications for effort updates
- [ ] Permission sharing UI
- [ ] Workstream templates

## Development Commands
```bash
npm run dev          # Start dev server (NO Turbopack - incompatible with Puppeteer)
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
supabase db push     # Push migrations to remote Supabase
```

### Testing Chart Generation
```bash
# Regenerate chart and get URLs
curl "http://localhost:3000/api/test/render?graphId={ID}&userId={USER_ID}"

# View render page directly
open "http://localhost:3000/render/{graphId}?userId={USER_ID}&theme=dark"
```

## Deployment

### Vercel Configuration
- **Platform**: Vercel
- **Framework Preset**: Next.js
- **Node.js Version**: 22.x
- **Build Command**: `npm run build`
- **Environment Variables**: Set all required vars in Vercel dashboard
- **Production URL**: https://effort-ten.vercel.app

### Deployment Flow
1. Push to `main` branch on GitHub
2. Vercel auto-deploys (1-2 minutes)
3. Chart cache automatically invalidates on data changes
4. Test with `/api/test/render` endpoint

### Dependencies
- **Puppeteer**: `puppeteer-core` (no bundled Chromium)
- **Chromium**: `@sparticuz/chromium` (Vercel-compatible)
- **Buffer**: Required for Puppeteer in serverless

## File Structure
```
/app
  /api
    /chart
      /screenshot     # Puppeteer screenshot generation
      /invalidate     # Cache invalidation
    /slack
      /commands       # Slack slash command handler
    /test
      /render         # Test endpoint for chart verification
  /render/[graphId]
    page.tsx          # Server component (data fetching)
    chart-renderer.tsx # Client component (Recharts rendering)
  layout.tsx          # Root layout (with AuthProvider)
  page.tsx            # Main dashboard page

/components
  /ui                 # shadcn/ui components
  auth-provider.tsx   # Supabase auth context
  auth-gate.tsx       # Auth protection wrapper
  bottom-nav.tsx      # Mobile navigation
  effort-card.tsx     # Library grid card
  effort-pie-chart.tsx # Main chart component (web app)
  workstream-slider.tsx # Effort adjustment sliders
  account-tab.tsx     # User settings

/lib
  supabase.ts         # Type definitions
  supabase-browser.ts # Browser client
  supabase-server.ts  # Server client (cookies)
  supabase-service.ts # Service role client
  slack.ts            # Slack API utilities
  utils.ts            # Utilities (cn helper)

/supabase
  /migrations         # Database migrations
  config.toml         # Supabase config
```

## Important Notes

### Chart Rendering System
- **Single Source**: `/app/render/[graphId]/chart-renderer.tsx` is the only place to modify chart appearance
- **Puppeteer Limitations**:
  - Doesn't work in local dev (requires Vercel deployment)
  - Needs headless Chromium setup in serverless
  - 2-second wait for chart to fully render
- **Cache Strategy**:
  - Pre-generate on edit close (web app)
  - Cache in Supabase Storage
  - Timestamp URLs for Slack cache busting
  - Manual refresh with `?refresh=true` parameter

### Slack Integration Requirements
- **Request Verification**: Always verify Slack signatures
- **Timeout Handling**: Slack expects response within 3 seconds
- **Image URLs**: Must be publicly accessible (Supabase Storage)
- **Block Kit**: Use Slack's Block Kit for rich message formatting

### Adding New Visualization Types
1. Update `chart-renderer.tsx` with new visualization
2. Add type field to database schema
3. Update web UI to support new type
4. Puppeteer will automatically capture new visualizations for Slack
5. No changes needed to Slack integration code

### Performance Considerations
- Chart images cached in Supabase Storage
- 300-second cache control header
- Images only regenerated on data change or explicit refresh
- Lazy loading of images in web app
- Server-side data fetching for better performance
