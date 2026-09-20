export function toSeed(text: string): number {
  let seed = 0;
  for (const character of text.toLowerCase()) {
    const code = character.codePointAt(0) ?? 0;
    seed = (seed * 31 + code) % 1_000_003;
  }
  return seed;
}
