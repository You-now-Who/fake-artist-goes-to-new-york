const cache = new Map<string, HTMLAudioElement>()

export const playSound = (src: string, volume = 0.6): void => {
  if (typeof window === "undefined") return
  try {
    let audio = cache.get(src)
    if (!audio) {
      audio = new Audio(src)
      cache.set(src, audio)
    }
    audio.volume = volume
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {
    // silently ignore — audio is non-critical
  }
}

export const SOUNDS = {
  click: "/click.wav",
  hover: "/hover.wav",
  countdown: "/count_down.mp3",
  endDraw: "/endDraw.wav",
  finishRound: "/finish_round.wav",
} as const
