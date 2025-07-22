/**
 * Mini Arabic Shaper for CP864
 * Converts Unicode Arabic text to CP864 positional forms
 */

class CP864ArabicShaper {
    constructor() {
        // CP864 positional forms mapping (from the provided table)
        this.cp864Forms = {
            // Letters with full coverage (all 4 forms)
            0x0639: { // AIN
                isolated: 0xFEC9, initial: 0xFECB, medial: 0xFECC, final: 0xFECA
            },
            0x063A: { // GHAIN  
                isolated: 0xFECD, initial: 0xFECF, medial: 0xFED0, final: 0xFECE
            },
            
            // Letters with partial coverage (isolated + initial mostly)
            0x0627: { // ALEF
                isolated: 0xFE8D, final: 0xFE8E
            },
            0x0628: { // BEH
                isolated: 0xFE8F, initial: 0xFE91
            },
            0x062A: { // TEH
                isolated: 0xFE95, initial: 0xFE97
            },
            0x062B: { // THEH
                isolated: 0xFE99, initial: 0xFE9B
            },
            0x062C: { // JEEM
                isolated: 0xFE9D, initial: 0xFE9F
            },
            0x062D: { // HAH
                isolated: 0xFEA1, initial: 0xFEA3
            },
            0x062E: { // KHAH
                isolated: 0xFEA5, initial: 0xFEA7
            },
            0x0633: { // SEEN
                isolated: 0xFEB1, initial: 0xFEB3
            },
            0x0634: { // SHEEN
                isolated: 0xFEB5, initial: 0xFEB7
            },
            0x0635: { // SAD
                isolated: 0xFEB9, initial: 0xFEBB
            },
            0x0636: { // DAD
                isolated: 0xFEBD, initial: 0xFEBF
            },
            0x0641: { // FEH
                isolated: 0xFED1, initial: 0xFED3
            },
            0x0642: { // QAF
                isolated: 0xFED5, initial: 0xFED7
            },
            0x0643: { // KAF
                isolated: 0xFED9, initial: 0xFEDB
            },
            0x0644: { // LAM
                isolated: 0xFEDD, initial: 0xFEDF
            },
            0x0645: { // MEEM
                isolated: 0xFEE1, initial: 0xFEE3
            },
            0x0646: { // NOON
                isolated: 0xFEE5, initial: 0xFEE7
            },
            0x0647: { // HEH
                isolated: 0xFEE9, initial: 0xFEEB, medial: 0xFEEC
            },
            0x064A: { // YEH
                isolated: 0xFEF1, initial: 0xFEF3, final: 0xFEF2
            },
            
            // Non-connecting letters (isolated only)
            0x062F: { isolated: 0xFEA9 }, // DAL
            0x0630: { isolated: 0xFEAB }, // THAL
            0x0631: { isolated: 0xFEAD }, // REH
            0x0632: { isolated: 0xFEAF }, // ZAIN
            0x0637: { isolated: 0xFEC1 }, // TAH
            0x0638: { isolated: 0xFEC5 }, // ZAH
            0x0648: { isolated: 0xFEED }, // WAW
            0x0649: { isolated: 0xFEEF, final: 0xFEF0 }, // ALEF MAKSURA
            
            // Special characters
            0x0622: { isolated: 0xFE81, final: 0xFE82 }, // ALEF WITH MADDA ABOVE
            0x0623: { isolated: 0xFE83, final: 0xFE84 }, // ALEF WITH HAMZA ABOVE
            0x0624: { isolated: 0xFE85 }, // WAW WITH HAMZA ABOVE
            0x0626: { initial: 0xFE8B }, // YEH WITH HAMZA ABOVE
            0x0629: { isolated: 0xFE93 }, // TEH MARBUTA
            0x0621: { isolated: 0xFE80 }, // HAMZA
        };

        // Characters that don't connect to following characters
        this.rightNonConnectors = new Set([
            0x0627, 0x0622, 0x0623, 0x0624, 0x0629, 0x0621, // ALEF variants, TEH MARBUTA, HAMZA
            0x062F, 0x0630, 0x0631, 0x0632, 0x0637, 0x0638, // DAL, THAL, REH, ZAIN, TAH, ZAH
            0x0648, 0x0649 // WAW, ALEF MAKSURA
        ]);

        // LAM+ALEF ligatures (CP864 supports these)
        this.lamAlefLigatures = {
            // LAM (0x0644) + ALEF variants
            [`${0x0644}_${0x0627}`]: { isolated: 0xFEFB, final: 0xFEFC }, // LAM + ALEF
            [`${0x0644}_${0x0622}`]: { isolated: 0xFEF5, final: 0xFEF6 }, // LAM + ALEF WITH MADDA ABOVE
            [`${0x0644}_${0x0623}`]: { isolated: 0xFEF7, final: 0xFEF8 }, // LAM + ALEF WITH HAMZA ABOVE
        };
    }

    /**
     * Determines if a character can connect to the right (following character)
     */
    canConnectRight(charCode) {
        return this.cp864Forms[charCode] && !this.rightNonConnectors.has(charCode);
    }

    /**
     * Determines if a character can connect to the left (previous character)
     */
    canConnectLeft(charCode) {
        return this.cp864Forms[charCode] && !this.rightNonConnectors.has(charCode);
    }

    /**
     * Gets the appropriate positional form with CP864 fallback logic
     */
    getPositionalForm(charCode, connectsLeft, connectsRight) {
        const forms = this.cp864Forms[charCode];
        if (!forms) return null;

        // Try to get the ideal form first
        let targetForm;
        if (connectsLeft && connectsRight) {
            targetForm = 'medial';
        } else if (connectsLeft) {
            targetForm = 'final';
        } else if (connectsRight) {
            targetForm = 'initial';
        } else {
            targetForm = 'isolated';
        }

        // If the ideal form exists, use it
        if (forms[targetForm]) {
            return forms[targetForm];
        }

        // CP864 fallback logic
        if (targetForm === 'medial' && forms.initial) {
            return forms.initial; // medial → initial fallback
        }
        if (targetForm === 'final' && forms.isolated) {
            return forms.isolated; // final → isolated fallback
        }
        
        // Last resort: return isolated form
        return forms.isolated || null;
    }

    /**
     * Checks for LAM+ALEF ligatures
     */
    checkLamAlefLigature(codePoints, pos) {
        if (pos >= codePoints.length - 1) return null;
        
        const lam = codePoints[pos];
        const alef = codePoints[pos + 1];
        
        if (lam === 0x0644) { // LAM
            const ligatureKey = `${lam}_${alef}`;
            if (this.lamAlefLigatures[ligatureKey]) {
                return {
                    ligature: this.lamAlefLigatures[ligatureKey],
                    consumed: 2 // LAM + ALEF = 2 characters
                };
            }
        }
        return null;
    }

    /**
     * Main shaping function
     */
    shape(text) {
        if (!text) return [];
        
        const codePoints = Array.from(text, char => char.codePointAt(0));
        const result = [];
        
        for (let i = 0; i < codePoints.length; i++) {
            const currentChar = codePoints[i];
            
            // Check for LAM+ALEF ligature first
            const ligature = this.checkLamAlefLigature(codePoints, i);
            if (ligature) {
                // Determine if ligature connects to left
                const prevChar = i > 0 ? codePoints[i - 1] : null;
                const connectsLeft = prevChar && this.canConnectRight(prevChar);
                
                const ligatureForm = connectsLeft && ligature.ligature.final 
                    ? ligature.ligature.final 
                    : ligature.ligature.isolated;
                
                result.push(ligatureForm);
                i += ligature.consumed - 1; // Skip the ALEF
                continue;
            }
            
            // Regular character processing
            if (this.cp864Forms[currentChar]) {
                // Determine connection context
                const prevChar = i > 0 ? codePoints[i - 1] : null;
                const nextChar = i < codePoints.length - 1 ? codePoints[i + 1] : null;
                
                const connectsLeft = prevChar && this.canConnectRight(prevChar);
                const connectsRight = nextChar && this.canConnectLeft(nextChar);
                
                const shaped = this.getPositionalForm(currentChar, connectsLeft, connectsRight);
                if (shaped) {
                    result.push(shaped);
                } else {
                    result.push(currentChar); // Fallback to original
                }
            } else {
                // Non-Arabic character, pass through
                result.push(currentChar);
            }
        }
        
        return result;
    }

    /**
     * Shape text and return as string
     */
    shapeToString(text) {
        return String.fromCodePoint(...this.shape(text));
    }

    /**
     * Shape a single character in context (for encoding manager)
     */
    shapeSingle(char, prevChar = null, nextChar = null) {
        const currentCode = char.codePointAt(0);
        
        // Check if this is an Arabic character that needs shaping
        if (!this.cp864Forms[currentCode]) {
            return currentCode; // Not Arabic, return as-is
        }
        
        const prevCode = prevChar ? prevChar.codePointAt(0) : null;
        const nextCode = nextChar ? nextChar.codePointAt(0) : null;
        
        const connectsLeft = prevCode && this.canConnectRight(prevCode);
        const connectsRight = nextCode && this.canConnectLeft(nextCode);
        
        const shaped = this.getPositionalForm(currentCode, connectsLeft, connectsRight);
        return shaped || currentCode;
    }
}

module.exports = CP864ArabicShaper;