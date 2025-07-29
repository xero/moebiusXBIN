const iconv = require('iconv-lite');
const { cp437_to_unicode, unicode_to_cp437 } = require('./encodings');
const CP864ArabicShaper = require('./cp864_arabic_shaper');

// All available encodings supported by iconv-lite
const AVAILABLE_ENCODINGS = [
    // UNICODE ENCODINGS
    "UTF8", "UTF7", "UTF7-IMAP", "UTF16LE", "UTF16BE", "UTF-16", "UCS2", "CESU8",
    "UCS-4", "UTF-32LE", "UTF-32BE", "ASCII",
    
    // STANDARD IBM/DOS CODE PAGES
    "CP437", "CP720", "CP737", "CP775", "CP808", "CP850", "CP851", "CP852", "CP853",
    "CP855", "CP856", "CP857", "CP858", "CP860", "CP861", "CP862", "CP863", "CP864",
    "CP865", "CP866", "CP869", "CP922", "CP1046", "CP1124", "CP1125", "CP1129",
    "CP1133", "CP1161", "CP1162", "CP1163",
    
    // WINDOWS CODE PAGES
    "CP874", "CP1250", "CP1251", "CP1252", "CP1253", "CP1254", "CP1255", "CP1256",
    "CP1257", "CP1258",
    
    // ISO 8859 SERIES
    "ISO-8859-1", "ISO-8859-2", "ISO-8859-3", "ISO-8859-4", "ISO-8859-5", "ISO-8859-6",
    "ISO-8859-7", "ISO-8859-8", "ISO-8859-9", "ISO-8859-10", "ISO-8859-11", "ISO-8859-13",
    "ISO-8859-14", "ISO-8859-15", "ISO-8859-16", "LATIN1",
    
    // KOI8 ENCODINGS
    "KOI8-R", "KOI8-U", "KOI8-RU", "KOI8-T",
    
    // MACINTOSH ENCODINGS
    "MACINTOSH", "MACROMAN", "MACCROATIAN", "MACCYRILLIC", "MACGREEK", "MACICELAND",
    "MACROMANIA", "MACTHAI", "MACTURKISH", "MACUKRAINE", "MACCENTEURO",
    
    // JAPANESE ENCODINGS
    "Shift_JIS", "Windows-31j", "CP932", "EUC-JP",
    
    // CHINESE SIMPLIFIED ENCODINGS
    "GB2312", "GBK", "GB18030", "CP936", "EUC-CN",
    
    // KOREAN ENCODINGS
    "KS_C_5601", "CP949", "EUC-KR",
    
    // CHINESE TRADITIONAL ENCODINGS
    "Big5", "Big5-HKSCS", "CP950", "EUC-TW",
    
    // OTHER SINGLE-BYTE ENCODINGS
    "ARMSCII8", "RK1048", "TCVN", "GEORGIANACADEMY", "GEORGIANPS", "PT154", "VISCII",
    "ISO646CN", "ISO646JP", "HPROMAN8", "TIS620"
];

// Encoding descriptions for menu display
const ENCODING_DESCRIPTIONS = {
    // UNICODE ENCODINGS
    "UTF8": "UTF-8 (Unicode)",
    "UTF7": "UTF-7 (Unicode)",
    "UTF7-IMAP": "UTF-7 IMAP (Unicode)",
    "UTF16LE": "UTF-16 LE (Unicode)",
    "UTF16BE": "UTF-16 BE (Unicode)",
    "UTF-16": "UTF-16 with BOM (Unicode)",
    "UCS2": "UCS-2 (Unicode)",
    "CESU8": "CESU-8 (Unicode)",
    "UCS-4": "UCS-4 / UTF-32 with BOM",
    "UTF-32LE": "UTF-32 LE (Unicode)",
    "UTF-32BE": "UTF-32 BE (Unicode)",
    "ASCII": "ASCII (7-bit)",
    
    // STANDARD IBM/DOS CODE PAGES
    "CP437": "CP437 (Original IBM PC)",
    "CP720": "CP720 (Arabic)",
    "CP737": "CP737 (Greek)",
    "CP775": "CP775 (Baltic)",
    "CP808": "CP808 (Russian/Cyrillic)",
    "CP850": "CP850 (Latin-1)",
    "CP851": "CP851 (Greek)",
    "CP852": "CP852 (Latin-2)",
    "CP853": "CP853 (Latin-3)",
    "CP855": "CP855 (Cyrillic)",
    "CP856": "CP856 (Hebrew)",
    "CP857": "CP857 (Turkish)",
    "CP858": "CP858 (Latin-1 + Euro)",
    "CP860": "CP860 (Portuguese)",
    "CP861": "CP861 (Icelandic)",
    "CP862": "CP862 (Hebrew)",
    "CP863": "CP863 (French Canadian)",
    "CP864": "CP864 (Arabic)",
    "CP865": "CP865 (Nordic)",
    "CP866": "CP866 (Russian)",
    "CP869": "CP869 (Greek)",
    "CP922": "CP922 (Estonian)",
    "CP1046": "CP1046 (Arabic)",
    "CP1124": "CP1124 (Ukrainian)",
    "CP1125": "CP1125 (Ukrainian)",
    "CP1129": "CP1129 (Vietnamese)",
    "CP1133": "CP1133 (Lao)",
    "CP1161": "CP1161 (Thai)",
    "CP1162": "CP1162 (Thai)",
    "CP1163": "CP1163 (Vietnamese)",
    
    // WINDOWS CODE PAGES
    "CP874": "CP874 (Thai)",
    "CP1250": "CP1250 (Central European)",
    "CP1251": "CP1251 (Cyrillic)",
    "CP1252": "CP1252 (Western European)",
    "CP1253": "CP1253 (Greek)",
    "CP1254": "CP1254 (Turkish)",
    "CP1255": "CP1255 (Hebrew)",
    "CP1256": "CP1256 (Arabic)",
    "CP1257": "CP1257 (Baltic)",
    "CP1258": "CP1258 (Vietnamese)",
    
    // ISO 8859 SERIES
    "ISO-8859-1": "ISO-8859-1 (Latin-1 / Western European)",
    "ISO-8859-2": "ISO-8859-2 (Latin-2 / Central European)",
    "ISO-8859-3": "ISO-8859-3 (Latin-3 / South European)",
    "ISO-8859-4": "ISO-8859-4 (Latin-4 / North European)",
    "ISO-8859-5": "ISO-8859-5 (Cyrillic)",
    "ISO-8859-6": "ISO-8859-6 (Arabic)",
    "ISO-8859-7": "ISO-8859-7 (Greek)",
    "ISO-8859-8": "ISO-8859-8 (Hebrew)",
    "ISO-8859-9": "ISO-8859-9 (Latin-5 / Turkish)",
    "ISO-8859-10": "ISO-8859-10 (Latin-6 / Nordic)",
    "ISO-8859-11": "ISO-8859-11 (Thai)",
    "ISO-8859-13": "ISO-8859-13 (Latin-7 / Baltic)",
    "ISO-8859-14": "ISO-8859-14 (Latin-8 / Celtic)",
    "ISO-8859-15": "ISO-8859-15 (Latin-9 / Western European + Euro)",
    "ISO-8859-16": "ISO-8859-16 (Latin-10 / South-Eastern European)",
    "LATIN1": "Latin-1 (ISO-8859-1)",
    
    // KOI8 ENCODINGS
    "KOI8-R": "KOI8-R (Russian)",
    "KOI8-U": "KOI8-U (Ukrainian)",
    "KOI8-RU": "KOI8-RU (Russian/Ukrainian)",
    "KOI8-T": "KOI8-T (Tajik)",
    
    // MACINTOSH ENCODINGS
    "MACINTOSH": "Macintosh Roman",
    "MACROMAN": "Mac Roman",
    "MACCROATIAN": "Mac Croatian",
    "MACCYRILLIC": "Mac Cyrillic",
    "MACGREEK": "Mac Greek",
    "MACICELAND": "Mac Icelandic",
    "MACROMANIA": "Mac Romanian",
    "MACTHAI": "Mac Thai",
    "MACTURKISH": "Mac Turkish",
    "MACUKRAINE": "Mac Ukrainian",
    "MACCENTEURO": "Mac Central European",
    
    // JAPANESE ENCODINGS
    "Shift_JIS": "Shift JIS (Japanese)",
    "Windows-31j": "Windows-31J (Japanese)",
    "CP932": "CP932 (Japanese Shift JIS)",
    "EUC-JP": "EUC-JP (Japanese)",
    
    // CHINESE SIMPLIFIED ENCODINGS
    "GB2312": "GB2312 (Chinese Simplified)",
    "GBK": "GBK (Chinese Simplified Extended)",
    "GB18030": "GB18030 (Chinese National Standard)",
    "CP936": "CP936 (Chinese Simplified)",
    "EUC-CN": "EUC-CN (Chinese Simplified)",
    
    // KOREAN ENCODINGS
    "KS_C_5601": "KS C 5601 (Korean)",
    "CP949": "CP949 (Korean)",
    "EUC-KR": "EUC-KR (Korean)",
    
    // CHINESE TRADITIONAL ENCODINGS
    "Big5": "Big5 (Chinese Traditional)",
    "Big5-HKSCS": "Big5-HKSCS (Chinese Traditional + Hong Kong)",
    "CP950": "CP950 (Chinese Traditional)",
    "EUC-TW": "EUC-TW (Chinese Traditional)",
    
    // OTHER SINGLE-BYTE ENCODINGS
    "ARMSCII8": "ARMSCII-8 (Armenian)",
    "RK1048": "RK1048 (Kazakh)",
    "TCVN": "TCVN (Vietnamese)",
    "GEORGIANACADEMY": "Georgian Academy",
    "GEORGIANPS": "Georgian PS",
    "PT154": "PT154 (Cyrillic Asian)",
    "VISCII": "VISCII (Vietnamese)",
    "ISO646CN": "ISO646-CN (Chinese)",
    "ISO646JP": "ISO646-JP (Japanese)",
    "HPROMAN8": "HP Roman-8",
    "TIS620": "TIS-620 (Thai)"
};

// Encoding groups for menu organization
const ENCODING_GROUPS = {
    "Unicode Encodings": [
        "UTF8", "UTF7", "UTF7-IMAP", "UTF16LE", "UTF16BE", "UTF-16", "UCS2", "CESU8",
        "UCS-4", "UTF-32LE", "UTF-32BE", "ASCII"
    ],
    "IBM/DOS Code Pages": [
        "CP437", "CP720", "CP737", "CP775", "CP808", "CP850", "CP851", "CP852", "CP853",
        "CP855", "CP856", "CP857", "CP858", "CP860", "CP861", "CP862", "CP863", "CP864",
        "CP865", "CP866", "CP869", "CP922", "CP1046", "CP1124", "CP1125", "CP1129",
        "CP1133", "CP1161", "CP1162", "CP1163"
    ],
    "Windows Code Pages": [
        "CP874", "CP1250", "CP1251", "CP1252", "CP1253", "CP1254", "CP1255", "CP1256",
        "CP1257", "CP1258"
    ],
    "ISO 8859 Series": [
        "ISO-8859-1", "ISO-8859-2", "ISO-8859-3", "ISO-8859-4", "ISO-8859-5", "ISO-8859-6",
        "ISO-8859-7", "ISO-8859-8", "ISO-8859-9", "ISO-8859-10", "ISO-8859-11", "ISO-8859-13",
        "ISO-8859-14", "ISO-8859-15", "ISO-8859-16", "LATIN1"
    ],
    "KOI8 Encodings": [
        "KOI8-R", "KOI8-U", "KOI8-RU", "KOI8-T"
    ],
    "Macintosh Encodings": [
        "MACINTOSH", "MACROMAN", "MACCROATIAN", "MACCYRILLIC", "MACGREEK", "MACICELAND",
        "MACROMANIA", "MACTHAI", "MACTURKISH", "MACUKRAINE", "MACCENTEURO"
    ],
    "Japanese Encodings": [
        "Shift_JIS", "Windows-31j", "CP932", "EUC-JP"
    ],
    "Chinese Simplified": [
        "GB2312", "GBK", "GB18030", "CP936", "EUC-CN"
    ],
    "Korean Encodings": [
        "KS_C_5601", "CP949", "EUC-KR"
    ],
    "Chinese Traditional": [
        "Big5", "Big5-HKSCS", "CP950", "EUC-TW"
    ],
    "Other Encodings": [
        "ARMSCII8", "RK1048", "TCVN", "GEORGIANACADEMY", "GEORGIANPS", "PT154", "VISCII",
        "ISO646CN", "ISO646JP", "HPROMAN8", "TIS620"
    ]
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

function get_encoding_groups() {
    return ENCODING_GROUPS;
}

// Helper function to check if a character is Arabic
function isArabicCharacter(unicode_char) {
    return (unicode_char >= 0x0600 && unicode_char <= 0x06FF) || // Arabic block
           (unicode_char >= 0xFE80 && unicode_char <= 0xFEFF) || // Arabic Presentation Forms-B
           (unicode_char >= 0xFB50 && unicode_char <= 0xFDFF);   // Arabic Presentation Forms-A
}

// Strip combining Arabic diacritics (not supported in text mode)
function stripCombiningDiacritics(text) {
    // Combining diacritics to strip (text mode doesn't support combining characters)
    const combiningDiacritics = new Set([
        0x064B, // FATHATAN
        0x064C, // DAMMATAN  
        0x064D, // KASRATAN
        0x064E, // FATHA
        0x064F, // DAMMA
        0x0650, // KASRA
        0x0651, // SHADDAH
        0x0652, // SUKUN
        0x0653, // MADDAH ABOVE
        0x0654, // HAMZA ABOVE
        0x0655, // HAMZA BELOW
        0x0656, // SUBSCRIPT ALEF
        0x0657, // INVERTED DAMMA
        0x0658, // MARK NOON GHUNNA
        0x0670  // SUPERSCRIPT ALEF
    ]);
    
    return Array.from(text).filter(char => {
        const code = char.codePointAt(0);
        return !combiningDiacritics.has(code);
    }).join('');
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
            
            // Now always object format
            if (isolated.codePoint === presentationChar || initial.codePoint === presentationChar || 
                medial.codePoint === presentationChar || final.codePoint === presentationChar) {
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
        
        // Strip combining diacritics from all characters
        const cleanChar = stripCombiningDiacritics(char);
        const cleanPrevChar = prevCharStr ? stripCombiningDiacritics(prevCharStr) : null;
        const cleanNextChar = nextCharStr ? stripCombiningDiacritics(nextCharStr) : null;
        
        // If the character was entirely diacritics, skip it
        if (!cleanChar) {
            return null; // Signal to skip this character
        }
        
        // Use the shaper's single character shaping with context
        const shaped_result = arabicShaper.shapeSingle(cleanChar, cleanPrevChar, cleanNextChar);
        
        // Now always returns object format
        const shaped_char_code = shaped_result.codePoint;
        
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
    
    // Check for ligature formation first (right + current in RTL)
    if (rightBlock && prevCharCode && isArabicCharacter(prevCharCode)) {
        const prevChar = String.fromCharCode(prevCharCode);
        const currentChar = String.fromCharCode(baseCharCode);
        
        // Check if previous + current forms a ligature using base characters
        const ligatureResult = arabicShaper.shapeSingle(prevChar, null, currentChar);
        
        if (ligatureResult.isLigature) {
            // Replace the right character with the ligature
            const ligatureCode = unicode_to_encoding(ligatureResult.codePoint);
            doc.change_data(x + 1, y, ligatureCode, rightBlock.fg, rightBlock.bg);
            
            // Remove the current character by making it a space
            doc.change_data(x, y, 32, currentBlock.fg, currentBlock.bg); // ASCII space
            return true; // Indicate ligature was formed
        }
    }
    
    // Regular contextual shaping
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
    
    return false; // No ligature was formed
}


module.exports = {
    set_encoding,
    get_encoding,
    get_available_encodings,
    get_encoding_description,
    get_encoding_groups,
    unicode_to_encoding,
    encoding_to_unicode,
    apply_contextual_shaping,
    AVAILABLE_ENCODINGS,
    ENCODING_GROUPS
};