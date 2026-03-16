"use client"

import React, { useEffect, useState } from "react"
import { useGameStore } from "@/lib/game-store"

const CategoryAssignView = () => {
  const { state } = useGameStore()
  const { role } = state
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  if (!role) return null

  const isFake = role.role === "fake"

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="max-w-sm w-full space-y-4 text-center">

        {/* Role card */}
        <div className={`pixel-box p-8 ${isFake ? "bg-rose-50 border-rose-500 shadow-[3px_3px_0_0_#f43f5e]" : "bg-emerald-50 border-emerald-500 shadow-[3px_3px_0_0_#10b981]"}`}>
          <div className="text-5xl mb-4">{isFake ? "🎭" : "🎨"}</div>

          <h2 className="font-pixel text-zinc-900 mb-4 leading-relaxed" style={{ fontSize: "11px" }}>
            {isFake ? "You are the\nFake Artist!" : "You are a\nReal Artist!"}
          </h2>

          <div className={`inline-block px-4 py-2 border-2 mb-4 ${isFake ? "border-rose-500 bg-rose-100" : "border-emerald-500 bg-emerald-100"}`}>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Category</p>
            <p className="font-bold text-zinc-900 text-lg">{role.category}</p>
          </div>

          {isFake ? (
            <p className="text-sm text-zinc-700 leading-relaxed">
              You <strong>don't know the subject</strong>.<br />
              Draw something plausible and blend in!
            </p>
          ) : (
            <div className="space-y-3">
              <div className="pixel-box-sm bg-white px-4 py-3 border-emerald-400">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Secret Subject</p>
                <p className="font-pixel text-emerald-700 text-lg">{role.subject}</p>
              </div>
              <p className="text-sm text-zinc-700">Draw subtly — don't give it away to the fake!</p>
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="pixel-box bg-white p-4">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Drawing starts in</p>
          <p className="font-pixel text-amber-500 text-3xl">{countdown}</p>
        </div>
      </div>
    </div>
  )
}

export default CategoryAssignView
