import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const graphId = searchParams.get('graphId')
    const userId = searchParams.get('userId')
    const refresh = searchParams.get('refresh') === 'true'

    if (!graphId) {
      return new NextResponse('Missing graphId', { status: 400 })
    }

    const supabase = createServiceClient()

    // Get graph to check cache, get author ID, and updated_at timestamp
    const { data: graph } = await supabase
      .from('effort_graphs')
      .select('author_id, updated_at')
      .eq('id', graphId)
      .single()

    if (!graph) {
      return new NextResponse('Graph not found', { status: 404 })
    }

    // Convert updated_at to Unix timestamp for filename
    const updatedAtTimestamp = new Date(graph.updated_at).getTime()

    // Get user's theme preference
    const lookupUserId = userId || graph.author_id
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', lookupUserId)
      .single()

    const theme = preferences?.theme || 'dark'

    // Use updated_at timestamp in filename for cache busting
    const fileName = `${graph.author_id}/${graphId}-${theme}-${updatedAtTimestamp}.png`

    // If refresh requested, delete all old versions for this graph/theme
    if (refresh) {
      // List all files matching the pattern
      const { data: existingFiles } = await supabase
        .storage
        .from('effort-charts')
        .list(graph.author_id, {
          search: `${graphId}-${theme}`
        })

      // Delete all old versions
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${graph.author_id}/${f.name}`)
        await supabase
          .storage
          .from('effort-charts')
          .remove(filesToDelete)
      }
    }

    // Check if pre-generated chart exists for this exact timestamp
    const { data: existingFiles } = await supabase
      .storage
      .from('effort-charts')
      .list(graph.author_id, {
        search: `${graphId}-${theme}-${updatedAtTimestamp}.png`
      })

    // If pre-generated chart exists and no refresh requested, redirect to it
    if (existingFiles && existingFiles.length > 0 && !refresh) {
      const { data: { publicUrl } } = supabase
        .storage
        .from('effort-charts')
        .getPublicUrl(fileName)

      return NextResponse.redirect(publicUrl)
    }

    // Delete old versions for this graph/theme before generating new one
    const { data: oldFiles } = await supabase
      .storage
      .from('effort-charts')
      .list(graph.author_id, {
        search: `${graphId}-${theme}-`
      })

    if (oldFiles && oldFiles.length > 0) {
      const filesToDelete = oldFiles.map(f => `${graph.author_id}/${f.name}`)
      await supabase
        .storage
        .from('effort-charts')
        .remove(filesToDelete)
    }

    // Generate chart using Puppeteer - navigate to our render page
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 800 })

    // Navigate to the render page that uses our actual Recharts component
    const renderUrl = `${request.nextUrl.origin}/render/${graphId}?userId=${lookupUserId}&theme=${theme}`
    await page.goto(renderUrl, { waitUntil: 'networkidle0' })

    // Wait for chart to fully render
    await new Promise(resolve => setTimeout(resolve, 2000))

    const screenshot = await page.screenshot({ type: 'png' })
    await browser.close()

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('effort-charts')
      .upload(fileName, screenshot, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '300',
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      // Return image directly if upload fails
      return new NextResponse(Buffer.from(screenshot), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      })
    }

    // Get public URL and redirect
    const { data: { publicUrl } } = supabase
      .storage
      .from('effort-charts')
      .getPublicUrl(fileName)

    return NextResponse.redirect(publicUrl)
  } catch (error) {
    console.error('Error generating chart:', error)
    return new NextResponse('Error generating chart', { status: 500 })
  }
}
