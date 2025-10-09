# Slack App Setup Guide

## Overview
This guide will help you set up the Effort Slack app to share and manage your effort allocations directly in Slack.

## Prerequisites
- Admin access to your Slack workspace
- Deployed Effort app (for webhook URLs)

## Step 1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. Name: "Effort"
5. Select your workspace

## Step 2: Configure OAuth & Permissions

Go to "OAuth & Permissions" and add these scopes:

**Bot Token Scopes:**
- `chat:write` - Post messages to channels
- `commands` - Add slash commands
- `links:read` - View URLs in messages
- `links:write` - Unfurl links with rich previews
- `users:read` - View users in workspace

## Step 3: Enable Events

1. Go to "Event Subscriptions"
2. Turn on "Enable Events"
3. Request URL: `https://your-app.vercel.app/api/slack/events`
4. Subscribe to bot events:
   - `app_mention` - When someone @mentions the bot
   - `link_shared` - When effort links are shared
5. Add domain: `your-app.vercel.app` under "App Unfurl Domains"

## Step 4: Add Slash Commands

Go to "Slash Commands" and create:

**Command:** `/effort`
- Request URL: `https://your-app.vercel.app/api/slack/commands`
- Short Description: "Manage your effort allocations"
- Usage Hint: `list | view [name] | share [name]`

## Step 5: Enable Interactivity

1. Go to "Interactivity & Shortcuts"
2. Turn on "Interactivity"
3. Request URL: `https://your-app.vercel.app/api/slack/interactive`

## Step 6: Install App to Workspace

1. Go to "Install App"
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## Step 7: Add Environment Variables

Add these to your Vercel environment variables:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

Find these values in your Slack app settings:
- Bot Token: OAuth & Permissions
- Signing Secret: Basic Information
- Client ID & Secret: Basic Information

## Step 8: Link Slack Users to App Users

Users will need to connect their Slack account to their Effort account. This can be done via:
1. OAuth flow (recommended)
2. Manual linking in account settings

## Usage

Once set up, users can:

### Slash Commands
- `/effort list` - List all efforts
- `/effort view [name]` - View effort details
- `/effort share [name]` - Share effort to channel

### Share Button
Click the share button in the web app and select Slack from the share sheet.

### Link Unfurling
When you paste an effort link in Slack, it will automatically show a rich preview with the pie chart.

## Troubleshooting

**Events not working?**
- Check Request URL is correct
- Verify app is installed to workspace
- Check Vercel logs for errors

**Commands not responding?**
- Verify slash command URL is correct
- Check Vercel deployment is live
- Look for errors in Vercel logs

**Can't share to Slack?**
- Ensure bot is added to the channel
- Verify OAuth token is correct
- Check bot has `chat:write` permission
