export function renderDescription(text: string) {
  const paragraphs = text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0)

  if (paragraphs.length <= 1) {
    const lines = text.split('\n').filter((line) => line.trim().length > 0)
    return lines.map((line, index) => (
      <p key={index} className="leading-relaxed">
        {line}
      </p>
    ))
  }

  return paragraphs.map((paragraph, index) => (
    <p key={index} className="leading-relaxed">
      {paragraph}
    </p>
  ))
}
