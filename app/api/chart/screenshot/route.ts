import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const graphId = searchParams.get('graphId')
    const userId = searchParams.get('userId')

    if (!graphId) {
      return new NextResponse('Missing graphId', { status: 400 })
    }

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

    // Get user's theme preference
    const lookupUserId = userId || graph.author_id
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', lookupUserId)
      .single()

    const theme = preferences?.theme || 'dark'
    const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'
    const textColor = theme === 'dark' ? '#e5e5e5' : '#1a1a1a'

    // Check if pre-generated chart exists in storage
    const fileName = `${graph.author_id}/${graphId}-${theme}.png`
    const { data: existingFiles } = await supabase
      .storage
      .from('effort-charts')
      .list(graph.author_id, {
        search: `${graphId}-${theme}.png`
      })

    // If pre-generated chart exists, redirect to it
    if (existingFiles && existingFiles.length > 0) {
      const { data: { publicUrl } } = supabase
        .storage
        .from('effort-charts')
        .getPublicUrl(fileName)

      return NextResponse.redirect(publicUrl)
    }

    // Generate chart using Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600 })

    // Create HTML with Chart.js
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: ${bgColor};
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            canvas {
              max-width: 100%;
              max-height: 100%;
            }
          </style>
        </head>
        <body>
          <canvas id="chart"></canvas>
          <script>
            const ctx = document.getElementById('chart');
            new Chart(ctx, {
              type: 'pie',
              data: {
                labels: ${JSON.stringify(workstreams.map(w => w.name))},
                datasets: [{
                  data: ${JSON.stringify(workstreams.map(w => w.effort))},
                  backgroundColor: ${JSON.stringify(workstreams.map(w => w.color))},
                  borderWidth: 3,
                  borderColor: '${bgColor}'
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  title: {
                    display: true,
                    text: ${JSON.stringify(graph.name)},
                    color: '${textColor}',
                    font: {
                      size: 24,
                      weight: 'bold'
                    },
                    padding: {
                      top: 20,
                      bottom: 20
                    }
                  },
                  legend: {
                    position: 'right',
                    labels: {
                      color: '${textColor}',
                      font: {
                        size: 16
                      },
                      padding: 15,
                      generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels && data.datasets.length) {
                          return data.labels.map((label, i) => {
                            const value = data.datasets[0].data[i];
                            return {
                              text: label + ': ' + value.toFixed(1) + '%',
                              fillStyle: data.datasets[0].backgroundColor[i],
                              strokeStyle: data.datasets[0].backgroundColor[i],
                              hidden: false,
                              index: i
                            };
                          });
                        }
                        return [];
                      }
                    }
                  }
                },
                layout: {
                  padding: {
                    top: 10,
                    bottom: 10,
                    left: 20,
                    right: 20
                  }
                }
              }
            });
          </script>
        </body>
      </html>
    `

    await page.setContent(html)
    await page.waitForSelector('canvas')
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for chart to render

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
      return new NextResponse(screenshot, {
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
