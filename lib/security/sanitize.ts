/**
 * Shared sanitization utilities for input validation and prompt injection defense.
 */

const PROMPT_INJECTION_PATTERNS = [
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS?/gi,
  /NEW\s+SYSTEM\s+INSTRUCTION/gi,
  /YOU\s+ARE\s+NOW/gi,
  /\bSYSTEM\s*:/gi,
  /---+/g,
  /```/g,
]

/**
 * Strips known prompt injection patterns from user input while preserving
 * normal text including Swedish characters (å, ä, ö).
 */
export function sanitizeForPrompt(input: string, maxLength = 20000): string {
  let sanitized = input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }
  return sanitized.slice(0, maxLength)
}

/**
 * Escapes special characters before embedding user input in tagged prompt sections.
 * This prevents tag breakouts like "</cv_content>".
 */
export function escapeForPromptSection(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Validates an Arbetsförmedlingen job ID: digits only, 1-15 chars.
 */
export function isValidAfJobId(id: string): boolean {
  return /^\d{1,15}$/.test(id)
}

/**
 * Hardened filename sanitizer: strips path separators, leading dots, and
 * non-word characters. Caps length at 255 chars.
 */
export function sanitizeFilename(filename: string): string {
  let safe = filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/^\.+/, '')
    .replace(/[^\w.\-]+/g, '_')
  return safe.slice(0, 255)
}

/**
 * Truncates a string for safe logging. Appends [truncated] if shortened.
 */
export function truncateForLog(value: string, maxLength = 100): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength) + '[truncated]'
}
