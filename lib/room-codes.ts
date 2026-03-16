const ADJECTIVES = [
  "red", "blue", "green", "bold", "swift", "brave", "wild", "calm",
  "dark", "bright", "fuzzy", "witty", "sly", "clever", "quick", "odd",
]

const NOUNS = [
  "fox", "bear", "wolf", "shark", "hawk", "crow", "lynx", "frog",
  "mole", "owl", "duck", "crab", "newt", "toad", "fish", "wren",
]

export const generateRoomCode = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 99) + 1
  return `${adj}-${noun}-${num}`
}
