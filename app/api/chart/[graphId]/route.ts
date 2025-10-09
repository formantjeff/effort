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

    // Create chart
    const width = 600
    const height = 400
    const chartCallback = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' })

    const configuration = {
      type: 'pie' as const,
      data: {
        labels: workstreams.map(w => w.name),
        datasets: [{
          data: workstreams.map(w => w.effort),
          backgroundColor: workstreams.map(w => w.color),
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: graph.name,
            font: {
              size: 20,
            },
          },
          legend: {
            position: 'right' as const,
            labels: {
              font: {
                size: 14,
              },
              generateLabels: (chart: any) => {
                const data = chart.data
                if (data.labels && data.datasets.length) {
                  return data.labels.map((label: string, i: number) => {
                    const value = data.datasets[0].data[i]
                    return {
                      text: `${label}: ${value.toFixed(1)}%`,
                      fillStyle: data.datasets[0].backgroundColor[i],
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
