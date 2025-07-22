const iconv = require('iconv-lite');
const { cp437_to_unicode, unicode_to_cp437 } = require('./encodings');
const CP864ArabicShaper = require('./cp864_arabic_shaper');

// Available encodings based on the fonts in the IBM folder
const AVAILABLE_ENCODINGS = [
    // STANDARD IBM CODE PAGES
    "CP437", "CP737", "CP775", "CP850", "CP851", "CP852", "CP853", 
    "CP855", "CP857", "CP860", "CP861", "CP862", "CP863", "CP864", 
    "CP865", "CP866", "CP869",
    // WINDOWS CODE PAGES
    "CP1250", "CP1251", "CP1252", "CP1253", "CP1254", "CP1257",
    // ISO 8859 SERIES
    "ISO88591", "ISO88592", "ISO88594", "ISO88595", "ISO88597",
    "ISO88598", "ISO885915",
    // KOI ENCODINGS
    "KOI8R", "KOI8U",
    // OTHER STANDARD ENCODINGS
    "ASCII", "UTF8", "UTF16LE", "UTF16BE", "LATIN1",
    // REGIONAL/LANGUAGE SPECIFIC THAT MAP TO STANDARD ENCODINGS
    "MACINTOSH", "MACROMAN"
];

// Encoding descriptions for menu display
const ENCODING_DESCRIPTIONS = {
    // STANDARD IBM CODE PAGES
    "CP437": "CP437 (Original IBM PC)",
    "CP737": "CP737 (Greek)",
    "CP775": "CP775 (Baltic)",
    "CP850": "CP850 (Latin-1)",
    "CP851": "CP851 (Greek)",
    "CP852": "CP852 (Latin-2)",
    "CP853": "CP853 (Latin-3)",
    "CP855": "CP855 (Cyrillic)",
    "CP857": "CP857 (Turkish)",
    "CP860": "CP860 (Portuguese)",
    "CP861": "CP861 (Icelandic)",
    "CP862": "CP862 (Hebrew)",
    "CP863": "CP863 (French Canadian)",
    "CP864": "CP864 (Arabic)",
    "CP865": "CP865 (Nordic)",
    "CP866": "CP866 (Russian)",
    "CP869": "CP869 (Greek)",
    // WINDOWS CODE PAGES
    "CP1250": "CP1250 (Central European)",
    "CP1251": "CP1251 (Cyrillic)",
    "CP1252": "CP1252 (Western European)",
    "CP1253": "CP1253 (Greek)",
    "CP1254": "CP1254 (Turkish)",
    "CP1257": "CP1257 (Baltic)",
    // ISO 8859 SERIES
    "ISO88591": "ISO-8859-1 (Latin-1)",
    "ISO88592": "ISO-8859-2 (Latin-2)",
    "ISO88594": "ISO-8859-4 (Baltic)",
    "ISO88595": "ISO-8859-5 (Cyrillic)",
    "ISO88597": "ISO-8859-7 (Greek)",
    "ISO88598": "ISO-8859-8 (Hebrew)",
    "ISO885915": "ISO-8859-15 (Latin-9)",
    // KOI ENCODINGS
    "KOI8R": "KOI8-R (Russian)",
    "KOI8U": "KOI8-U (Ukrainian)",
    // OTHER STANDARD ENCODINGS
    "ASCII": "ASCII (7-bit)",
    "UTF8": "UTF-8 (Unicode)",
    "UTF16LE": "UTF-16 LE (Unicode)",
    "UTF16BE": "UTF-16 BE (Unicode)",
    "LATIN1": "Latin-1 (ISO-8859-1)",
    // REGIONAL/LANGUAGE SPECIFIC
    "MACINTOSH": "Macintosh Roman",
    "MACROMAN": "Mac Roman"
};

let current_encoding = 'CP437';

// Initialize Arabic shaper for CP864
const arabicShaper = new CP864ArabicShaper();


function set_encoding(encoding) {
    if (AVAILABLE_ENCODINGS.includes(encoding)) {
        current_encoding = encoding;
        return true;
    }
    return false;
}

function get_encoding() {
    return current_encoding;
}

function get_available_encodings() {
    return [...AVAILABLE_ENCODINGS];
}

function get_encoding_description(encoding) {
    return ENCODING_DESCRIPTIONS[encoding] || encoding;
}

// Helper function to check if a character is Arabic
function isArabicCharacter(unicode_char) {
    return (unicode_char >= 0x0600 && unicode_char <= 0x06FF) || // Arabic block
           (unicode_char >= 0xFE80 && unicode_char <= 0xFEFF) || // Arabic Presentation Forms-B
           (unicode_char >= 0xFB50 && unicode_char <= 0xFDFF);   // Arabic Presentation Forms-A
}

// Convert Arabic presentation forms back to base characters
function presentationFormToBase(presentationChar) {
    // This mapping converts presentation forms back to their base characters
    // We need to check our CP864 shaper for the actual mappings
    if (presentationChar >= 0xFE80 && presentationChar <= 0xFEFF) {
        // For now, let's use a simple approach - ask the shaper to reverse map
        // This is not the most efficient, but it will work for debugging
        const shaper = arabicShaper;
        
        // Try to find which base character produces this presentation form
        for (let baseChar = 0x0600; baseChar <= 0x06FF; baseChar++) {
            const isolated = shaper.shapeSingle(String.fromCharCode(baseChar));
            const initial = shaper.shapeSingle(String.fromCharCode(baseChar), null, String.fromCharCode(0x0628)); // with next
            const medial = shaper.shapeSingle(String.fromCharCode(baseChar), String.fromCharCode(0x0628), String.fromCharCode(0x0628)); // with both
            const final = shaper.shapeSingle(String.fromCharCode(baseChar), String.fromCharCode(0x0628), null); // with prev
            
            if (isolated === presentationChar || initial === presentationChar || 
                medial === presentationChar || final === presentationChar) {
                return baseChar;
            }
        }
    }
    
    // If not a presentation form or not found, return as-is
    return presentationChar;
}

// Immediate encoding function (for backward compatibility and non-Arabic)
function unicode_to_encoding_immediate(unicode_char) {
    // Special handling for CP437 to preserve control characters
    if (current_encoding === 'CP437') {
        return unicode_to_cp437(unicode_char);
    }
    
    // For other encodings, use iconv-lite
    try {
        const char = String.fromCharCode(unicode_char);
        const encoded = iconv.encode(char, current_encoding);
        
        // Return the first byte as the code point
        if (encoded.length > 0) {
            return encoded[0];
        }
        
        // If encoding fails, check if it's a standard ASCII character
        if (unicode_char >= 32 && unicode_char <= 126) {
            return unicode_char;
        }
        
        // For unmappable characters, return 0 to indicate failure
        return 0;
    } catch (error) {
        console.warn(`Failed to encode character ${unicode_char} to ${current_encoding}:`, error);
        return 0;
    }
}

function unicode_to_encoding(unicode_char, prevChar = null, nextChar = null) {
    // Special handling for CP437 to preserve control characters
    if (current_encoding === 'CP437') {
        return unicode_to_cp437(unicode_char);
    }
    
    // Special handling for CP864 with Arabic shaping
    if (current_encoding === 'CP864' && isArabicCharacter(unicode_char)) {
        const char = String.fromCharCode(unicode_char);
        const prevCharStr = prevChar ? String.fromCharCode(prevChar) : null;
        const nextCharStr = nextChar ? String.fromCharCode(nextChar) : null;
        
        // Use the shaper's single character shaping with context
        const shaped_char_code = arabicShaper.shapeSingle(char, prevCharStr, nextCharStr);
        
        try {
            const shaped_char = String.fromCharCode(shaped_char_code);
            const encoded = iconv.encode(shaped_char, current_encoding);
            
            if (encoded.length > 0) {
                return encoded[0];
            }
        } catch (error) {
            // Fall through to regular encoding
        }
    }
    
    return unicode_to_encoding_immediate(unicode_char);
}

function encoding_to_unicode(code) {
    // Special handling for CP437 to preserve control characters
    if (current_encoding === 'CP437') {
        return cp437_to_unicode(code);
    }
    
    // For other encodings, use iconv-lite
    try {
        const buffer = Buffer.from([code]);
        const decoded = iconv.decode(buffer, current_encoding);
        
        if (decoded.length > 0) {
            return decoded;
        }
        
        // Fallback for invalid codes
        return String.fromCharCode(code);
    } catch (error) {
        console.warn(`Failed to decode code ${code} from ${current_encoding}:`, error);
        return String.fromCharCode(code);
    }
}

// Apply contextual shaping after character placement
function apply_contextual_shaping(doc, x, y) {
    if (current_encoding !== 'CP864') return;
    
    // Get the character at the current position and its neighbors
    const currentBlock = doc.at(x, y);
    if (!currentBlock) return;
    
    // Check if the current character is Arabic and needs reshaping
    const currentUnicode = encoding_to_unicode(currentBlock.code);
    if (!currentUnicode || typeof currentUnicode !== 'string') return;
    
    const currentCharCode = currentUnicode.charCodeAt(0);
    if (!isArabicCharacter(currentCharCode)) return;
    
    // Convert presentation form back to base character for contextual processing
    const baseCharCode = presentationFormToBase(currentCharCode);
    
    // Get context - RTL: previous = right (x+1), next = left (x-1)
    const rightBlock = x < doc.columns - 1 ? doc.at(x + 1, y) : null;
    const leftBlock = x > 0 ? doc.at(x - 1, y) : null;
    
    const prevCharCode = rightBlock ? presentationFormToBase(encoding_to_unicode(rightBlock.code)?.charCodeAt(0)) : null;
    const nextCharCode = leftBlock ? presentationFormToBase(encoding_to_unicode(leftBlock.code)?.charCodeAt(0)) : null;
    
    // Re-encode current character with context
    const newCode = unicode_to_encoding(baseCharCode, prevCharCode, nextCharCode);
    if (newCode !== currentBlock.code) {
        doc.change_data(x, y, newCode, currentBlock.fg, currentBlock.bg);
    }
    
    // Update right character if it needs reshaping
    if (rightBlock && prevCharCode && isArabicCharacter(prevCharCode)) {
        const rightRightBlock = x < doc.columns - 2 ? doc.at(x + 2, y) : null;
        const rightRightCharCode = rightRightBlock ? presentationFormToBase(encoding_to_unicode(rightRightBlock.code)?.charCodeAt(0)) : null;
        
        const basePrevCharCode = presentationFormToBase(prevCharCode);
        const newPrevCode = unicode_to_encoding(basePrevCharCode, rightRightCharCode, baseCharCode);
        if (newPrevCode !== rightBlock.code) {
            doc.change_data(x + 1, y, newPrevCode, rightBlock.fg, rightBlock.bg);
        }
    }
}

module.exports = {
    set_encoding,
    get_encoding,
    get_available_encodings,
    get_encoding_description,
    unicode_to_encoding,
    encoding_to_unicode,
    apply_contextual_shaping,
    AVAILABLE_ENCODINGS
};