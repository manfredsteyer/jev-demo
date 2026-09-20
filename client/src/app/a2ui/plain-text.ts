const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function renderPlainText(text: string): Promise<string> {
  const escaped = text.replace(/[&<>"']/g, (character) => ENTITIES[character] ?? character);
  return Promise.resolve(`<p>${escaped}</p>`);
}
