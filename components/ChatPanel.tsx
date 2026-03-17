"use client"

import React, { useRef, useEffect, useState, KeyboardEvent } from "react"
import type { ChatMessage } from "@/types/game"

interface ChatPanelProps {
  messages: ChatMessage[]
  myId: string | null
  onSend: (text: string) => void
}

const ChatPanel = ({ messages, myId, onSend }: ChatPanelProps) => {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="px-2 py-1.5 border-b-2 border-zinc-900 bg-zinc-900">
        <p className="text-xs font-pixel text-amber-300" style={{ fontSize: "8px" }}>CHAT</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-4">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.playerId === myId ? "items-end" : "items-start"}`}>
            {msg.playerId !== myId && (
              <span className="text-xs font-bold text-zinc-500 mb-0.5">{msg.playerName}</span>
            )}
            <div className={`px-2 py-1 text-xs max-w-[90%] border-2 font-medium ${
              msg.playerId === myId
                ? "bg-amber-300 text-amber-950 border-amber-600"
                : "bg-zinc-100 text-zinc-900 border-zinc-400"
            }`}
            style={{ wordBreak: "break-word" }}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-1.5 border-t-2 border-zinc-300">
        <div className="flex gap-1 min-w-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            maxLength={200}
            className="flex-1 min-w-0 text-xs px-2 py-1.5 pixel-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="pixel-btn shrink-0 px-2 py-1 bg-amber-400 text-amber-950 font-black text-xs"
            aria-label="Send"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
