import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ graphId: string }> }
) {
  try {
    const { graphId } = await params
    const supabase = createServiceClient()

    // Get graph and workstreams
    const { data: graph } = await supabase
      .from('effort_graphs')
      .select('name')
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

    // Create chart with neutral background that works in both light and dark Slack
    const width = 800
    const height = 500
    const bgColor = '#1a1a1a' // Dark background similar to your app
    const textColor = '#e5e5e5' // Light text

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

    const image = await chartCallback.renderToBuffer(configuration)

    return new NextResponse(image, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('Error generating chart:', error)
    return new NextResponse('Error generating chart', { status: 500 })
  }
}
