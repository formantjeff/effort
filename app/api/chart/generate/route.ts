import { NextRequest, NextResponse } from 'next/server'

// Pre-generate and cache chart images by calling the existing chart endpoint
export async function POST(request: NextRequest) {
  try {
    const { graphId, userId } = await request.json()

    if (!graphId || !userId) {
      return NextResponse.json({ error: 'Missing graphId or userId' }, { status: 400 })
    }

    const origin = request.nextUrl.origin

    // Call the chart endpoint to trigger generation and caching
    const chartUrl = `${origin}/api/chart/${graphId}?userId=${userId}`
    const response = await fetch(chartUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to generate chart' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: chartUrl })
  } catch (error) {
    console.error('Error pre-generating chart:', error)
    return NextResponse.json({ error: 'Error generating chart' }, { status: 500 })
  }
}
