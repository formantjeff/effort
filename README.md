# Effort

A web-based dashboard for evaluating and assigning workstreams to team members with proportional effort allocation.

## Features

- 📊 **Interactive Pie Chart** - Visualize effort distribution across workstreams in real-time
- 🎚️ **Effort Sliders** - Adjust proportional levels of effort with intuitive slider controls
- 📁 **Multiple Effort Graphs** - Create and manage multiple named effort graphs
- 👥 **Collaboration** - Share graphs with team members with viewer/editor permissions
- 🔐 **Authentication** - Secure magic link authentication via Supabase
- ➕ **Dynamic Workstreams** - Create and delete workstreams on the fly
- 🎨 **Color-coded** - Each workstream gets a unique color for easy identification
- 💾 **Persistent Storage** - All data is stored in Supabase for reliability
- ⚠️ **Relative Visualization** - Pie chart always shows relative proportions (normalized to 100%)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 1. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Once your project is created, go to the SQL Editor
3. Run the SQL schema from `supabase-schema.sql` to create the `workstreams` table
4. Go to Settings → API to find your project URL and anon key

### 2. Environment Variables

Copy `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Usage

1. **Add Workstream**: Click the "Add Stream" button to create a new workstream
2. **Name Workstream**: Click on the workstream name to edit it
3. **Adjust Effort**: Use the slider to allocate effort percentage (0-100%)
4. **Delete Workstream**: Click the X button to remove a workstream
5. **Monitor Total**: Watch the total effort percentage and capacity indicators

The pie chart on the right updates in real-time as you adjust effort allocations.

## Database Schema

The application uses a single `workstreams` table:

- `id` (UUID) - Primary key
- `name` (TEXT) - Workstream name
- `effort` (NUMERIC) - Effort percentage (0-100)
- `color` (TEXT) - Hex color code
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

## Project Structure

```
effort/
├── app/
│   ├── page.tsx              # Main dashboard page
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── workstream-slider.tsx # Left panel with sliders
│   └── effort-pie-chart.tsx  # Right panel with pie chart
├── lib/
│   ├── supabase.ts          # Supabase client & types
│   └── utils.ts             # Utility functions
└── supabase-schema.sql      # Database schema
```

## Contributing

Feel free to open issues or submit pull requests to improve the project.

## License

MIT
