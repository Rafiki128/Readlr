export function narrationLines(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map(line => line.trim()).filter(Boolean) ?? [text];
}
