'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

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
  const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'
  const textColor = theme === 'dark' ? '#e5e5e5' : '#1a1a1a'

  return (
    <html>
      <head>
        <style>{`
          body {
            margin: 0;
            padding: 20px;
            background: ${bgColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          h1 {
            color: ${textColor};
            font-size: 32px;
            font-weight: bold;
            margin: 0 0 30px 0;
            text-align: center;
          }
        `}</style>
      </head>
      <body>
        <h1>{graphName}</h1>
        <div style={{ width: '800px', height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(entry: any) => `${entry.value.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </body>
    </html>
  )
}
