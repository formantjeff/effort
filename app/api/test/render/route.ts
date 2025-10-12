import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to trigger fresh chart regeneration
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const graphId = searchParams.get('graphId')
  const userId = searchParams.get('userId')

  if (!graphId) {
    return NextResponse.json({ error: 'graphId required' }, { status: 400 })
  }

  const origin = request.nextUrl.origin

  // Call screenshot endpoint with refresh=true to force regeneration
  const screenshotUrl = `${origin}/api/chart/screenshot?graphId=${graphId}&userId=${userId || ''}&refresh=true`

  try {
    const response = await fetch(screenshotUrl, {
      redirect: 'follow'
    })

    if (!response.ok) {
      return NextResponse.json({
        error: 'Screenshot generation failed',
        status: response.status,
        statusText: response.statusText
      }, { status: 500 })
    }

    // Get the final URL after redirect
    const finalUrl = response.url

    return NextResponse.json({
      success: true,
      screenshotUrl: finalUrl,
      message: 'Chart regenerated successfully',
      renderUrl: `${origin}/render/${graphId}?userId=${userId || ''}&theme=dark`
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to regenerate chart',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
