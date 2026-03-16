"use client"

import React, { useRef, useEffect, useCallback, useState } from "react"
import type { Stroke, StrokePoint } from "@/types/game"

interface DrawingCanvasProps {
  strokes: Stroke[]
  isMyTurn: boolean
  brushColor: string
  brushWidth: number
  brushOpacity: number
  pendingStroke: Stroke | null
  /** Called when the user finishes drawing a stroke (pointer up). Does NOT submit — parent decides when to submit. */
  onStrokeDrawn: (stroke: Omit<Stroke, "id" | "playerId">) => void
}

const DrawingCanvas = ({
  strokes,
  isMyTurn,
  brushColor,
  brushWidth,
  brushOpacity,
  pendingStroke,
  onStrokeDrawn,
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const currentPoints = useRef<StrokePoint[]>([])
  const hasDrawnThisTurn = useRef(false)
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0)
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Full redraw whenever confirmed strokes, pending stroke, or canvas size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of strokes) drawStroke(ctx, stroke, canvas.width, canvas.height)
    if (pendingStroke) drawStroke(ctx, pendingStroke, canvas.width, canvas.height)
  }, [strokes, pendingStroke, canvasSize])

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    w: number,
    h: number
  ) => {
    if (!stroke.points.length) return
    ctx.save()
    ctx.globalAlpha = stroke.opacity
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()

    const first = stroke.points[0]
    ctx.moveTo(first.x * w, first.y * h)

    if (stroke.points.length === 1) {
      ctx.arc(first.x * w, first.y * h, stroke.width / 2, 0, Math.PI * 2)
      ctx.fillStyle = stroke.color
      ctx.fill()
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  const getRelativePos = useCallback((clientX: number, clientY: number): StrokePoint => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isMyTurn || hasDrawnThisTurn.current) return
      e.currentTarget.setPointerCapture(e.pointerId)
      isDrawing.current = true
      currentPoints.current = [getRelativePos(e.clientX, e.clientY)]
    },
    [isMyTurn, getRelativePos]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return
      currentPoints.current.push(getRelativePos(e.clientX, e.clientY))

      // Live preview on canvas
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const s of strokes) drawStroke(ctx, s, canvas.width, canvas.height)
      if (pendingStroke) drawStroke(ctx, pendingStroke, canvas.width, canvas.height)
      drawStroke(
        ctx,
        { id: "live", playerId: "", points: currentPoints.current, color: brushColor, width: brushWidth, opacity: brushOpacity },
        canvas.width, canvas.height
      )
    },
    [strokes, pendingStroke, brushColor, brushWidth, brushOpacity, getRelativePos]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (!currentPoints.current.length) return
    hasDrawnThisTurn.current = true
    onStrokeDrawn({ points: currentPoints.current, color: brushColor, width: brushWidth, opacity: brushOpacity })
    currentPoints.current = []
  }, [brushColor, brushWidth, brushOpacity, onStrokeDrawn])

  // Reset the per-turn lock when my turn starts/ends
  useEffect(() => {
    if (!isMyTurn) hasDrawnThisTurn.current = false
  }, [isMyTurn])

  // Also reset when pending stroke is cleared (after submission)
  useEffect(() => {
    if (!pendingStroke) hasDrawnThisTurn.current = false
  }, [pendingStroke])

  const canDraw = isMyTurn && !pendingStroke

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`block w-full h-full ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
        style={{ touchAction: "none", background: "#FFFEF7", display: "block" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}

export default DrawingCanvas
