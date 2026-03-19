import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/**
 * Current share link schema version.
 * Bump this if the encoded payload format ever changes.
 */
const SHARE_VERSION = 1;

const VERSION_PREFIX_RE = /^v(\d+)~/;

/**
 * Encode source code into a versioned, URL-safe compressed string.
 * Format: `v<N>~<lz-compressed-code>`
 */
export function encodeShareCode(code: string): string {
  return `v${SHARE_VERSION}~${compressToEncodedURIComponent(code)}`;
}

/**
 * Decode a versioned share string back into source code.
 * Falls back to legacy (unversioned) links for backwards compatibility.
 */
export function decodeShareCode(encoded: string): string | null {
  try {
    const match = VERSION_PREFIX_RE.exec(encoded);
    if (match) {
      const version = Number(match[1]);
      const payload = encoded.slice(match[0].length);
      if (version === 1) {
        return decompressFromEncodedURIComponent(payload);
      }
      // Unknown future version — return null so callers show an error
      return null;
    }
    // Legacy link with no version prefix — decode directly (v1 format)
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
