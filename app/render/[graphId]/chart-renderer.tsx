'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface ChartData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface ChartRendererProps {
  graphName: string
  data: ChartData[]
  theme: 'light' | 'dark'
}

export default function ChartRenderer({ graphName, data, theme }: ChartRendererProps) {
  const bgColor = theme === 'dark' ? '#374151' : '#f9fafb'
  const cardBgColor = theme === 'dark' ? '#1f2937' : '#ffffff'
  const textColor = theme === 'dark' ? '#ffffff' : '#111827'
  const borderColor = theme === 'dark' ? '#4b5563' : '#e5e7eb'

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; payload: { value: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          border: `1px solid ${borderColor}`,
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontWeight: 600, color: textColor, margin: 0 }}>{payload[0].name}</p>
          <p style={{ fontSize: '14px', color: theme === 'dark' ? '#d1d5db' : '#6b7280', margin: '4px 0 0 0' }}>
            {payload[0].payload.value.toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <html>
      <head>
        <style>{`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: ${cardBgColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
          }
          .card {
            background: ${cardBgColor};
            border: 1px solid ${borderColor};
            border-radius: 12px;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
          }
          .card-header {
            padding: 16px 16px 0 16px;
            flex-shrink: 0;
          }
          .card-title {
            color: ${textColor};
            font-size: 24px;
            font-weight: 600;
            line-height: 1;
          }
          .card-content {
            padding: 16px;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">{graphName}</h1>
          </div>
          <div className="card-content">
            <div style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(props: any) => `${props.value.toFixed(1)}%`}
                    outerRadius="45%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
