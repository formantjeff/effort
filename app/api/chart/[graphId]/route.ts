import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ graphId: string }> }
) {
  try {
    const { graphId } = await params
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')

    const supabase = createServiceClient()

    // Get graph and workstreams
    const { data: graph } = await supabase
      .from('effort_graphs')
      .select('name, author_id')
      .eq('id', graphId)
      .single()

    if (!graph) {
      return new NextResponse('Graph not found', { status: 404 })
    }

    const { data: workstreams } = await supabase
      .from('workstreams')
      .select('name, effort, color')
      .eq('graph_id', graphId)
      .order('created_at', { ascending: true })

    if (!workstreams || workstreams.length === 0) {
      return new NextResponse('No workstreams found', { status: 404 })
    }

    // Get user's theme preference (use requesting user if provided, otherwise graph author)
    const lookupUserId = userId || graph.author_id
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', lookupUserId)
      .single()

    const theme = preferences?.theme || 'dark'

    // Check if pre-generated chart exists in storage FIRST
    const fileName = `${graph.author_id}/${graphId}-${theme}.png`
    const { data: existingFile } = await supabase
      .storage
      .from('effort-charts')
      .list(graph.author_id, {
        search: `${graphId}-${theme}.png`
      })

    // If pre-generated chart exists, redirect to it for faster response
    if (existingFile && existingFile.length > 0) {
      const { data: { publicUrl } } = supabase
        .storage
        .from('effort-charts')
        .getPublicUrl(fileName)

      return NextResponse.redirect(publicUrl)
    }

    // Otherwise, generate chart on the fly
    const width = 800
    const height = 500
    const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'
    const textColor = theme === 'dark' ? '#e5e5e5' : '#1a1a1a'

    const chartCallback = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: bgColor,
      plugins: {
        modern: ['chartjs-plugin-datalabels'],
      }
    })

    const configuration = {
      type: 'pie' as const,
      data: {
        labels: workstreams.map(w => w.name),
        datasets: [{
          data: workstreams.map(w => w.effort),
          backgroundColor: workstreams.map(w => w.color),
          borderWidth: 3,
          borderColor: bgColor,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: graph.name,
            color: textColor,
            font: {
              size: 24,
              weight: 'bold' as const,
            },
            padding: {
              top: 20,
              bottom: 20,
            },
          },
          legend: {
            position: 'right' as const,
            labels: {
              color: textColor,
              font: {
                size: 16,
              },
              padding: 15,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              generateLabels: (chart: any) => {
                const data = chart.data
                if (data.labels && data.datasets.length) {
                  return data.labels.map((label: string, i: number) => {
                    const value = data.datasets[0].data[i]
                    return {
                      text: `${label}: ${value.toFixed(1)}%`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].backgroundColor[i],
                      hidden: false,
                      index: i,
                    }
                  })
                }
                return []
              },
            },
          },
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 20,
            right: 20,
          },
        },
      },
    }

    const image = await chartCallback.renderToBuffer(configuration as never)

    // Otherwise generate on the fly and cache it
    const { error: uploadError } = await supabase
      .storage
      .from('effort-charts')
      .upload(fileName, Buffer.from(image), {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '300',
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      // Fall back to direct response if upload fails
      return new NextResponse(Buffer.from(image), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      })
    }

    // Track Slack view
    try {
      // Log the view
      await supabase.from('effort_view_logs').insert({
        graph_id: graphId,
        source: 'slack',
        viewer_user_id: userId || null,
      })

      // Get current counts and increment
      const { data: shareData } = await supabase
        .from('shared_efforts')
        .select('slack_view_count, view_count')
        .eq('graph_id', graphId)
        .eq('is_active', true)
        .single()

      if (shareData) {
        await supabase
          .from('shared_efforts')
          .update({
            slack_view_count: shareData.slack_view_count + 1,
            view_count: shareData.view_count + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('graph_id', graphId)
          .eq('is_active', true)
      }
    } catch (error) {
      // Don't fail the request if tracking fails
      console.error('Error tracking view:', error)
    }

    // Return the image directly
    return new NextResponse(Buffer.from(image), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error generating chart:', error)
    return new NextResponse('Error generating chart', { status: 500 })
  }
}
