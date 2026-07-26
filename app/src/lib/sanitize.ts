/**
 * Content Sanitizer - Converts Unicode characters to ASCII equivalents
 * Prevents encoding errors when publishing to GitHub API
 */

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  replacements: Record<string, string>;
}

export class ContentSanitizer {
  // Comprehensive mapping of Unicode to ASCII
  private static readonly CHAR_MAP: Record<string, string> = {
    // Bullets and dashes
    '\u2022': '*',        // • bullet
    '\u00B7': '.',        // · middle dot
    '\u2218': 'o',        // ∘ ring operator
    '\u2013': '-',        // – en dash
    '\u2014': '-',        // — em dash
    '\u2212': '-',        // − minus sign
    '\u2010': '-',        // ‐ hyphen
    
    // Quotes - Use Unicode escapes
    '\u201C': '"',        // " left double quote
    '\u201D': '"',        // " right double quote
    '\u2018': "'",        // ' left single quote
    '\u2019': "'",        // ' right single quote
    '\u2039': '<',        // ‹ single left
    '\u203A': '>',        // › single right
    '\u00AB': '"',        // « left guillemet
    '\u00BB': '"',        // » right guillemet
    
    // Ellipsis and spaces
    '\u2026': '...',      // … ellipsis
    '\u00A0': ' ',        // non-breaking space
    '\u2003': ' ',        // em space
    '\u2002': ' ',        // en space
    '\u2009': ' ',        // thin space
    '\u2007': ' ',        // figure space
    '\u200B': '',         // zero-width space (strip)
    '\u200C': '',         // zero-width non-joiner (strip)
    '\u200D': '',         // zero-width joiner (strip)
    '\u2060': '',         // word joiner (strip)
    '\u2011': '-',        // non-breaking hyphen
    '\u202F': ' ',        // narrow no-break space
    
    // Special symbols
    '\u2122': '(TM)',     // ™ trademark
    '\u00AE': '(R)',      // ® registered
    '\u00A9': '(C)',      // © copyright
    '\u2713': '[✓]',      // ✓ check
    '\u2714': '[✓]',      // ✔ heavy check
    '\u2717': '[✗]',      // ✗ cross
    '\u2718': '[✗]',      // ✘ heavy cross
    '\u2605': '*',        // ★ star
    '\u2606': '*',        // ☆ star
    '\u2665': '<3',       // ♥ heart
    '\u2666': '<>',       // ♦ diamond
    
    // Mathematical
    '\u2264': '<=',       // ≤ less/equal
    '\u2265': '>=',       // ≥ greater/equal
    '\u2260': '!=',       // ≠ not equal
    '\u2248': '~=',       // ≈ approx
    '\u221E': 'inf',      // ∞ infinity
    '\u2202': 'd',        // ∂ partial
    '\u2211': 'sum',      // ∑ sum
    '\u221A': 'sqrt',     // √ root
    '\u222B': 'int',      // ∫ integral
    '\u222E': 'oint',     // ∮ contour
    
    // Currency
    '\u20AC': 'EUR',      // € euro
    '\u00A3': 'GBP',      // £ pound
    '\u00A5': 'JPY',      // ¥ yen
    '\u00A2': 'cents',    // ¢ cent
    '\u20B9': 'INR',      // ₹ rupee
    '\u20A4': 'Lt',       // ₤ lira
    
    // Common emojis
    '\u2705': '[OK]',       // ✅
    '\u274C': '[X]',        // ❌
    '\u26A0': '[WARNING]',  // ⚠️
    '\u1F680': '[ROCKET]',  // 🚀
    '\u1F4DD': '[NOTE]',    // 📝
    '\u1F4A1': '[IDEA]',    // 💡
    '\u1F3AF': '[TARGET]',  // 🎯
    '\u1F525': '[HOT]',     // 🔥
    '\u2728': '[SPARKLE]',  // ✨
    '\u1F31F': '[STAR]',    // 🌟
    '\u1F389': '[PARTY]',   // 🎉
    '\u1F60A': ':)',        // 😊
    '\u1F604': ':D',        // 😄
    '\u1F622': ':(',        // 😢
    '\u1F603': ':D',        // 😃
    '\u2764': '<3',         // ❤️
    '\u1F499': '<3',        // 💙
    '\u1F49A': '<3',        // 💚
    '\u1F49B': '<3',        // 💛
    '\u1F49C': '<3',        // 💜
  };
  
  /**
   * Sanitize text by replacing all Unicode characters with ASCII equivalents
   */
  static sanitize(text: string): string {
    if (!text) return '';
    
    let result = text;
    
    // Replace known Unicode characters using their Unicode escape codes
    for (const [char, ascii] of Object.entries(this.CHAR_MAP)) {
      result = result.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ascii);
    }
    
    // Remove or replace any remaining non-ASCII characters
    result = result.replace(/[^\x00-\x7F\n\r\t]/g, (char) => {
      // Replace unknown characters with a plain space instead of their code point
      return ' ';
    });
    
    return result;
  }
  
  /**
   * Validate content and report issues
   */
  static validate(text: string): ValidationResult {
    const issues: string[] = [];
    const replacements: Record<string, string> = {};
    const nonAscii: number[] = [];
    
    if (!text) {
      return { valid: true, issues: [], replacements: {} };
    }
    
    // Check for non-ASCII characters
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 127) {
        const char = text[i];
        const replacement = this.CHAR_MAP[char] || ' ';
        replacements[char] = replacement;
        nonAscii.push(i);
      }
    }
    
    if (nonAscii.length > 0) {
      const uniqueChars = Object.keys(replacements);
      issues.push(
        `Found ${nonAscii.length} non-ASCII characters including: ${uniqueChars.slice(0, 5).join(', ')}`
      );
      issues.push(
        `These will be replaced with: ${uniqueChars.slice(0, 5).map(c => `"${c}" → "${replacements[c]}"`).join(', ')}`
      );
    }
    
    return {
      valid: nonAscii.length === 0,
      issues,
      replacements
    };
  }
  
  /**
   * Quick sanitize for single fields
   */
  static sanitizeField(text: string): string {
    return this.sanitize(text);
  }
}
