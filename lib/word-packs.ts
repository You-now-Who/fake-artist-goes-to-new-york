export interface WordPack {
  category: string
  subjects: string[]
}

export const DEFAULT_WORD_PACKS: WordPack[] = [
  {
    category: "Animals",
    subjects: [
      "Flamingo", "Narwhal", "Platypus", "Axolotl", "Capybara",
      "Meerkat", "Quokka", "Tapir", "Pangolin", "Aye-aye",
    ],
  },
  {
    category: "Food",
    subjects: [
      "Spaghetti", "Croissant", "Sushi Roll", "Taco", "Pretzel",
      "Dumpling", "Churro", "Pavlova", "Pho", "Baklava",
    ],
  },
  {
    category: "Places",
    subjects: [
      "Eiffel Tower", "Great Wall", "Colosseum", "Machu Picchu", "Stonehenge",
      "Taj Mahal", "Grand Canyon", "Niagara Falls", "Mount Fuji", "Amazon River",
    ],
  },
  {
    category: "Objects",
    subjects: [
      "Telescope", "Hourglass", "Compass", "Typewriter", "Lantern",
      "Umbrella", "Anchor", "Magnifying Glass", "Pocket Watch", "Abacus",
    ],
  },
  {
    category: "Sports",
    subjects: [
      "Surfing", "Fencing", "Archery", "Curling", "Pole Vault",
      "Skeleton", "Hurling", "Lacrosse", "Kabaddi", "Sepak Takraw",
    ],
  },
  {
    category: "Mythical",
    subjects: [
      "Phoenix", "Kraken", "Basilisk", "Manticore", "Selkie",
      "Thunderbird", "Kirin", "Wendigo", "Bunyip", "Peryton",
    ],
  },
]

export const getRandomSubject = (category: string): string | null => {
  const pack = DEFAULT_WORD_PACKS.find((p) => p.category === category)
  if (!pack) return null
  return pack.subjects[Math.floor(Math.random() * pack.subjects.length)]
}
