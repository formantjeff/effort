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

    // Get graph to check cache and get author ID
    const { data: graph } = await supabase
      .from('effort_graphs')
      .select('author_id')
      .eq('id', graphId)
      .single()

    if (!graph) {
      return new NextResponse('Graph not found', { status: 404 })
    }

    // Get user's theme preference
    const lookupUserId = userId || graph.author_id
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', lookupUserId)
      .single()

    const theme = preferences?.theme || 'dark'

    // Check if pre-generated chart exists in storage
    const fileName = `${graph.author_id}/${graphId}-${theme}.png`

    // If refresh requested, delete old cache first
    if (refresh) {
      await supabase
        .storage
        .from('effort-charts')
        .remove([fileName])
    }

    // Check if pre-generated chart exists (after potential deletion)
    const { data: existingFiles } = await supabase
      .storage
      .from('effort-charts')
      .list(graph.author_id, {
        search: `${graphId}-${theme}.png`
      })

    // If pre-generated chart exists and no refresh requested, redirect to it
    if (existingFiles && existingFiles.length > 0 && !refresh) {
      const { data: { publicUrl } } = supabase
        .storage
        .from('effort-charts')
        .getPublicUrl(fileName)

      return NextResponse.redirect(publicUrl)
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
