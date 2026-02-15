const MOJIBAKE_PATTERN = /ÃƒÂ¤|ÃƒÂ¶|ÃƒÂ¥|Ãƒâ€ž|Ãƒâ€“|Ãƒâ€¦/

export async function parsePlainTextUpload(file: File, fileBytes: Uint8Array | null) {
  if (fileBytes) {
    let text = new TextDecoder('utf-8').decode(fileBytes)
    if (MOJIBAKE_PATTERN.test(text)) {
      text = new TextDecoder('windows-1252').decode(fileBytes)
    }
    return text
  }

  if (typeof file.text === 'function') {
    return file.text()
  }

  return '[File parsing not implemented]'
}
