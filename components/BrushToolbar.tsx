"use client"

import React from "react"

const PRESET_COLORS = [
  "#18181b", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ffffff", "#94a3b8",
]

const BRUSH_SIZES = [2, 4, 8, 14, 22]
const OPACITIES = [0.3, 0.6, 1.0]

interface BrushToolbarProps {
  color: string
  width: number
  opacity: number
  onColorChange: (c: string) => void
  onWidthChange: (w: number) => void
  onOpacityChange: (o: number) => void
  disabled?: boolean
}

const BrushToolbar = ({
  color, width, opacity, onColorChange, onWidthChange, onOpacityChange, disabled,
}: BrushToolbarProps) => (
  <div className={`flex flex-wrap items-center gap-3 p-2 pixel-box bg-white ${disabled ? "opacity-40 pointer-events-none" : ""}`}>

    {/* Colors */}
    <div className="flex flex-wrap gap-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          title={c}
          aria-label={`Select color ${c}`}
          className={`w-6 h-6 border-2 transition-transform ${
            color === c
              ? "border-amber-500 scale-110 shadow-[2px_2px_0_0_#18181b]"
              : "border-zinc-400 hover:border-zinc-700 hover:scale-105"
          }`}
          style={{ background: c }}
        />
      ))}
      <label
        className="w-6 h-6 border-2 border-dashed border-zinc-400 flex items-center justify-center text-xs text-zinc-500 cursor-pointer hover:border-zinc-700"
        title="Custom color"
      >
        <input
          type="color"
          className="sr-only"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
        />
        +
      </label>
    </div>

    <div className="w-px h-7 bg-zinc-300" />

    {/* Brush sizes */}
    <div className="flex items-center gap-1">
      {BRUSH_SIZES.map((s) => (
        <button
          key={s}
          onClick={() => onWidthChange(s)}
          aria-label={`Brush size ${s}`}
          title={`Size ${s}`}
          className={`w-7 h-7 flex items-center justify-center border-2 transition-colors ${
            width === s
              ? "border-amber-500 bg-amber-50"
              : "border-zinc-300 bg-white hover:border-zinc-700"
          }`}
        >
          <div
            className="rounded-full"
            style={{ width: Math.min(s, 20), height: Math.min(s, 20), background: color === "#ffffff" ? "#18181b" : color }}
          />
        </button>
      ))}
    </div>

    <div className="w-px h-7 bg-zinc-300" />

    {/* Opacity */}
    <div className="flex items-center gap-1">
      {OPACITIES.map((o) => (
        <button
          key={o}
          onClick={() => onOpacityChange(o)}
          aria-label={`Opacity ${Math.round(o * 100)}%`}
          className={`px-2 py-1 border-2 text-xs font-bold transition-colors ${
            opacity === o
              ? "border-amber-500 bg-amber-100 text-amber-900"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-700"
          }`}
        >
          {Math.round(o * 100)}%
        </button>
      ))}
    </div>
  </div>
)

export default BrushToolbar
