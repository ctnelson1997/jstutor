import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/**
 * Encode source code into a URL-safe compressed string.
 */
export function encodeShareCode(code: string): string {
  return compressToEncodedURIComponent(code);
}

/**
 * Decode a URL-safe compressed string back into source code.
 */
export function decodeShareCode(encoded: string): string | null {
  try {
    return decompressFromEncodedURIComponent(encoded);
  } catch {
    return null;
  }
}

/**
 * Static analysis: scan code text for suspicious API usage.
 * Returns a list of warning strings. Returns empty array if clean.
 */
export interface CodeFlag {
  level: 'warning' | 'info';
  message: string;
}

const SUSPICIOUS_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /\bfetch\s*\(/, message: 'This code makes network requests (fetch)' },
  { pattern: /\bXMLHttpRequest\b/, message: 'This code uses XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, message: 'This code opens WebSocket connections' },
  { pattern: /\bdocument\.cookie\b/, message: 'This code accesses cookies' },
  { pattern: /\blocalStorage\b/, message: 'This code accesses localStorage' },
  { pattern: /\bsessionStorage\b/, message: 'This code accesses sessionStorage' },
  { pattern: /\beval\s*\(/, message: 'This code uses dynamic eval()' },
  { pattern: /\bnew\s+Function\s*\(/, message: 'This code uses the Function constructor' },
  { pattern: /\blocation\s*\.\s*(href|replace|assign)\b/, message: 'This code may navigate the page' },
  { pattern: /\bwindow\.open\s*\(/, message: 'This code may open new windows' },
  { pattern: /\bimportScripts\s*\(/, message: 'This code imports external scripts' },
];

export function analyzeCode(code: string): CodeFlag[] {
  const flags: CodeFlag[] = [];
  for (const { pattern, message } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(code)) {
      flags.push({ level: 'warning', message });
    }
  }
  return flags;
}
