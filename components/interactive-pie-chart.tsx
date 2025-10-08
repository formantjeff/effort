'use client'

import { useRef, useEffect, useState } from 'react'
import { Workstream } from '@/lib/supabase'

interface InteractivePieChartProps {
  workstreams: Workstream[]
  onUpdateEffort: (id: string, effort: number) => void
  width?: number
  height?: number
}

export function InteractivePieChart({
  workstreams,
  onUpdateEffort,
  width = 400,
  height = 400,
}: InteractivePieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [tempEfforts, setTempEfforts] = useState<Record<string, number>>({})
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [initialEffort, setInitialEffort] = useState<number>(0)

  const centerX = width / 2
  const centerY = (height - 60) / 2 // Center in available space above legend
  const radius = 120 // Match the outerRadius from Recharts

  // Use temp efforts if dragging, otherwise use actual efforts
  const currentEfforts = workstreams.map((ws) =>
    tempEfforts[ws.id] !== undefined ? tempEfforts[ws.id] : ws.effort
  )
  const totalEffort = currentEfforts.reduce((sum, effort) => sum + effort, 0)

  // Calculate angles for each segment
  const getSegments = () => {
    let currentAngle = -Math.PI / 2 // Start at top

    return workstreams.map((ws, index) => {
      const effort = currentEfforts[index]
      const percentage = totalEffort > 0 ? effort / totalEffort : 0
      const angle = percentage * 2 * Math.PI
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      const midAngle = startAngle + angle / 2

      currentAngle = endAngle

      return {
        id: ws.id,
        name: ws.name,
        color: ws.color,
        effort,
        startAngle,
        endAngle,
        midAngle,
        percentage: percentage * 100,
      }
    })
  }

  const segments = getSegments()

  // Convert polar to cartesian coordinates
  const polarToCartesian = (angle: number, r: number = radius) => {
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    }
  }

  // Create SVG path for pie segment
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle)
    const end = polarToCartesian(endAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

    return [
      `M ${centerX} ${centerY}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      'Z',
    ].join(' ')
  }

  // Get angle from mouse/touch position
  const getAngleFromPoint = (clientX: number, clientY: number) => {
    if (!svgRef.current) return 0
    const rect = svgRef.current.getBoundingClientRect()
    const x = clientX - rect.left - centerX
    const y = clientY - rect.top - centerY
    return Math.atan2(y, x)
  }

  // Find which segment was clicked
  const findSegmentAtAngle = (angle: number) => {
    // Normalize angle to match our start angle (-PI/2)
    let normalizedAngle = angle
    if (normalizedAngle < -Math.PI / 2) {
      normalizedAngle += 2 * Math.PI
    }

    return segments.findIndex((seg) => {
      return normalizedAngle >= seg.startAngle && normalizedAngle <= seg.endAngle
    })
  }

  const handleStart = (clientX: number, clientY: number) => {
    const angle = getAngleFromPoint(clientX, clientY)
    const index = findSegmentAtAngle(angle)
    if (index !== -1) {
      setDraggingIndex(index)
      setDragStartX(clientX)
      setInitialEffort(workstreams[index].effort)
      // Initialize temp efforts
      const temp: Record<string, number> = {}
      workstreams.forEach((ws) => {
        temp[ws.id] = ws.effort
      })
      setTempEfforts(temp)
    }
  }

  const handleMove = (clientX: number) => {
    if (draggingIndex === null || workstreams.length < 2) return

    // Calculate horizontal drag distance
    const dragDistance = clientX - dragStartX

    // Convert pixels to percentage change (scale factor for sensitivity)
    // Positive = drag right = increase, Negative = drag left = decrease
    const sensitivityFactor = 0.2 // Adjust this to change drag sensitivity
    const effortChange = dragDistance * sensitivityFactor

    const nextIndex = (draggingIndex + 1) % workstreams.length
    const draggedId = workstreams[draggingIndex].id
    const nextId = workstreams[nextIndex].id

    // Calculate new efforts based on initial effort + change
    let newDraggedEffort = initialEffort + effortChange

    // Get the initial effort of the next segment
    const initialNextEffort = workstreams[nextIndex].effort
    let newNextEffort = initialNextEffort - effortChange

    // Clamp values between 0.5 and total minus other segments
    newDraggedEffort = Math.max(0.5, Math.min(95, newDraggedEffort))
    newNextEffort = Math.max(0.5, Math.min(95, newNextEffort))

    // Update temp efforts
    const newEfforts = { ...tempEfforts }
    newEfforts[draggedId] = newDraggedEffort
    newEfforts[nextId] = newNextEffort

    setTempEfforts(newEfforts)
  }

  const handleEnd = () => {
    if (draggingIndex !== null) {
      // Commit the changes to the database
      Object.entries(tempEfforts).forEach(([id, effort]) => {
        const ws = workstreams.find((w) => w.id === id)
        if (ws && Math.abs(ws.effort - effort) > 0.5) {
          onUpdateEffort(id, effort)
        }
      })
      setDraggingIndex(null)
      setTempEfforts({})
    }
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIndex !== null) {
      e.preventDefault()
      handleMove(e.clientX)
    }
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && draggingIndex !== null) {
      e.preventDefault()
      const touch = e.touches[0]
      handleMove(touch.clientX)
    }
  }

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalUp = () => handleEnd()
    window.addEventListener('mouseup', handleGlobalUp)
    window.addEventListener('touchend', handleGlobalUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp)
      window.removeEventListener('touchend', handleGlobalUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingIndex, tempEfforts])

  if (workstreams.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-gray-400 text-center">
          No workstreams yet.
          <br />
          Add a workstream to get started.
        </p>
      </div>
    )
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{ touchAction: 'none', cursor: draggingIndex !== null ? 'grabbing' : 'grab' }}
    >
      {segments.map((segment, index) => {
        const labelPos = polarToCartesian(segment.midAngle, radius * 0.65)
        const isActive = draggingIndex === index

        return (
          <g key={segment.id}>
            <path
              d={createArc(segment.startAngle, segment.endAngle)}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              opacity={isActive ? 0.9 : 1}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="16"
              fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {segment.percentage.toFixed(1)}%
            </text>
          </g>
        )
      })}
      {/* Legend */}
      <g transform={`translate(${centerX}, ${height - 25})`}>
        {segments.map((segment, index) => {
          const totalWidth = segments.length * 90
          const startX = -totalWidth / 2
          return (
            <g key={`legend-${segment.id}`} transform={`translate(${startX + index * 90}, 0)`}>
              <rect x="0" y="0" width="12" height="12" fill={segment.color} rx="2" />
              <text x="16" y="10" fontSize="11" fill="#666" fontWeight="500">
                {segment.name.length > 6 ? segment.name.substring(0, 6) + '...' : segment.name}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
