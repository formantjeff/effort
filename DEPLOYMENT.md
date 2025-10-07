# Vercel Deployment Guide

## Environment Variables

Add these environment variables in your Vercel project settings:

### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://ypkhawzbhrmwiqxmlenr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa2hhd3piaHJtd2lxeG1sZW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjQxODIsImV4cCI6MjA3NTQ0MDE4Mn0.FA-yDJ4_UdAq2IV-ejsr4dXgyPUiV9iFNyGZ0pj3J80
```

## Vercel Deployment Steps

1. **Push to GitHub**
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   - In the Vercel project settings, go to "Environment Variables"
   - Add both variables listed above
   - Make sure they're available for all environments (Production, Preview, Development)

4. **Deploy**
   - Vercel will automatically deploy
   - Your app will be live at: `https://your-project.vercel.app`

## Supabase Configuration

### Authentication Settings

Make sure to add your Vercel domain to Supabase auth settings:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to "Site URL": `https://your-project.vercel.app`
3. Add to "Redirect URLs":
   - `https://your-project.vercel.app/**`
   - `http://localhost:3000/**` (for local development)

### Email Templates

Configure magic link email templates in Supabase:
- Dashboard → Authentication → Email Templates
- Customize the magic link email with your branding

## Post-Deployment

After deployment:
1. Test authentication by logging in with your email
2. Create a test effort graph
3. Verify workstreams can be added and edited
4. Check that the pie chart updates correctly

## Troubleshooting

**If magic link emails aren't working:**
- Check Supabase logs: Dashboard → Logs → Auth Logs
- Verify redirect URLs are configured correctly
- Check spam folder for magic link emails

**If API requests fail:**
- Verify environment variables are set correctly in Vercel
- Check browser console for CORS errors
- Ensure Supabase project is not paused (free tier)

**Build errors:**
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Try building locally first: `npm run build`
