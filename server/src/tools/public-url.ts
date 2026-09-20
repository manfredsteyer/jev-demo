const PORT = process.env['PORT'] ?? '3000';

export const PUBLIC_URL = process.env['PUBLIC_URL'] ?? `http://localhost:${PORT}`;

export function toImageUrl(category: string, fileName: string): string {
  return `${PUBLIC_URL}/images/${category}/${fileName}`;
}
