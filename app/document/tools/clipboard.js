const electron = require("electron");
const libtextmode = require("../../libtextmode/libtextmode");
const doc = require("../doc");
const palette = require("../palette");

function copy(blocks) {
    const writingMode = doc.writing_mode; // "ltr", "rtl", "ttb", "btt"
    let result = [];
    
    switch (writingMode) {
        case "ltr": // Left-to-Right (normal)
            for (let y = 0, i = 0; y < blocks.rows; y++) {
                let line = "";
                for (let x = 0; x < blocks.columns; x++, i++) {
                    const unicode_char = libtextmode.encoding_manager.encoding_to_unicode(blocks.data[i].code);
                    line += unicode_char;
                }
                result.push(line.replace(/\s+$/, '')); // trim trailing spaces
            }
            break;
            
        case "rtl": // Right-to-Left
            for (let y = 0, i = 0; y < blocks.rows; y++) {
                let line = "";
                for (let x = 0; x < blocks.columns; x++, i++) {
                    const unicode_char = libtextmode.encoding_manager.encoding_to_unicode(blocks.data[i].code);
                    line += unicode_char;
                }
                const trimmed = line.replace(/\s+$/, '');
                result.push(trimmed.split('').reverse().join(''));
            }
            break;
            
        case "ttb": // Top-to-Bottom
            for (let x = 0; x < blocks.columns; x++) {
                let column = "";
                for (let y = 0; y < blocks.rows; y++) {
                    const i = y * blocks.columns + x;
                    const unicode_char = libtextmode.encoding_manager.encoding_to_unicode(blocks.data[i].code);
                    column += unicode_char;
                }
                result.push(column.replace(/\s+$/, '')); // trim trailing spaces
            }
            break;
            
        case "btt": // Bottom-to-Top
            for (let x = 0; x < blocks.columns; x++) {
                let column = "";
                for (let y = blocks.rows - 1; y >= 0; y--) {
                    const i = y * blocks.columns + x;
                    const unicode_char = libtextmode.encoding_manager.encoding_to_unicode(blocks.data[i].code);
                    column += unicode_char;
                }
                result.push(column.replace(/\s+$/, '')); // trim trailing spaces
            }
            break;
            
        default:
            // Fallback to LTR
            for (let y = 0, i = 0; y < blocks.rows; y++) {
                let line = "";
                for (let x = 0; x < blocks.columns; x++, i++) {
                    const unicode_char = libtextmode.encoding_manager.encoding_to_unicode(blocks.data[i].code);
                    line += unicode_char;
                }
                result.push(line.replace(/\s+$/, ''));
            }
    }
    
    electron.clipboard.write({text: result.join("\r\n"), html: JSON.stringify(blocks)});
}

function paste_blocks() {
    try {
        const blocks = JSON.parse(electron.clipboard.readHTML().replace(/^<[^>]+>/, ""));
        if (blocks.columns && blocks.rows && (blocks.data.length == blocks.columns * blocks.rows)) {
            return blocks;
        } else {
            throw("catch!");
        }
    } catch (err) {
        const text = electron.clipboard.readText();
        if (text.length) {
            let lines = text.split("\n").map((line) => line.replace(/\r$/, ""));
            if (!lines.length) return;
            
            // For CP864 Arabic text, preprocess to handle ligatures and diacritics
            if (libtextmode.encoding_manager.get_encoding() === 'CP864') {
                // Pre-formed ligatures that should be converted back to base characters
                const ligatureMap = new Map([
                    [0xFEFB, '\u0644\u0627'], // LAM+ALEF isolated → LAM + ALEF
                    [0xFEFC, '\u0644\u0627'], // LAM+ALEF final → LAM + ALEF  
                    [0xFEF5, '\u0644\u0622'], // LAM+ALEF WITH MADDA isolated → LAM + ALEF WITH MADDA
                    [0xFEF6, '\u0644\u0622'], // LAM+ALEF WITH MADDA final → LAM + ALEF WITH MADDA
                    [0xFEF7, '\u0644\u0623'], // LAM+ALEF WITH HAMZA isolated → LAM + ALEF WITH HAMZA ABOVE
                    [0xFEF8, '\u0644\u0623']  // LAM+ALEF WITH HAMZA final → LAM + ALEF WITH HAMZA ABOVE
                ]);
                
                const combiningDiacritics = new Set([
                    0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650, 0x0651, 
                    0x0652, 0x0653, 0x0654, 0x0655, 0x0656, 0x0657, 0x0658, 0x0670
                ]);
                
                lines = lines.map(line => {
                    // First expand pre-formed ligatures back to base characters
                    let processedLine = Array.from(line).map(char => {
                        const code = char.codePointAt(0);
                        return ligatureMap.get(code) || char;
                    }).join('');
                    
                    // Then strip combining diacritics
                    return Array.from(processedLine).filter(char => {
                        const code = char.codePointAt(0);
                        return !combiningDiacritics.has(code);
                    }).join('');
                });
            }
            
            
            const writingMode = doc.writing_mode;
            let columns, rows, data;
            const {fg, bg} = palette;
            
            switch (writingMode) {
                case "ltr": // Left-to-Right (normal)
                    columns = Math.max.apply(null, lines.map((line) => line.length));
                    rows = lines.length;
                    data = new Array(columns * rows);
                    
                    for (let y = 0, i = 0; y < rows; y++) {
                        for (let x = 0; x < columns; x++, i++) {
                            if (x >= lines[y].length) {
                                data[i] = {code: 32, fg, bg}; // space
                            } else {
                                const unicode_char = lines[y].charCodeAt(x);
                                // Provide context for Arabic shaping (same as keyboard input)
                                const prevChar = x > 0 ? lines[y].charCodeAt(x - 1) : null;
                                const nextChar = x < lines[y].length - 1 ? lines[y].charCodeAt(x + 1) : null;
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char, prevChar, nextChar);
                                data[i] = {code, fg, bg};
                            }
                        }
                    }
                    break;
                    
                case "rtl": // Right-to-Left
                    columns = Math.max.apply(null, lines.map((line) => line.length));
                    rows = lines.length;
                    data = new Array(columns * rows);
                    
                    for (let y = 0, i = 0; y < rows; y++) {
                        for (let x = 0; x < columns; x++, i++) {
                            if (x >= lines[y].length) {
                                data[i] = {code: 32, fg, bg}; // space
                            } else {
                                const unicode_char = lines[y].charCodeAt(x);
                                // Provide context for Arabic shaping (same as keyboard input)
                                const prevChar = x > 0 ? lines[y].charCodeAt(x - 1) : null;
                                const nextChar = x < lines[y].length - 1 ? lines[y].charCodeAt(x + 1) : null;
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char, prevChar, nextChar);
                                data[i] = {code, fg, bg};
                            }
                        }
                    }
                    break;
                    
                case "ttb": // Top-to-Bottom
                    columns = lines.length;
                    rows = Math.max.apply(null, lines.map((line) => line.length));
                    data = new Array(columns * rows);
                    
                    for (let x = 0; x < columns; x++) {
                        for (let y = 0; y < rows; y++) {
                            const i = y * columns + x;
                            if (y >= lines[x].length) {
                                data[i] = {code: 32, fg, bg}; // space
                            } else {
                                const unicode_char = lines[x].charCodeAt(y);
                                // Provide context for Arabic shaping (same as keyboard input)
                                const prevChar = y > 0 ? lines[x].charCodeAt(y - 1) : null;
                                const nextChar = y < lines[x].length - 1 ? lines[x].charCodeAt(y + 1) : null;
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char, prevChar, nextChar);
                                data[i] = {code, fg, bg};
                            }
                        }
                    }
                    break;
                    
                case "btt": // Bottom-to-Top
                    // Reverse each line for storage (BTT input -> TTB storage)
                    lines = lines.map(line => line.split('').reverse().join(''));
                    
                    columns = lines.length;
                    rows = Math.max.apply(null, lines.map((line) => line.length));
                    data = new Array(columns * rows);
                    
                    for (let x = 0; x < columns; x++) {
                        for (let y = 0; y < rows; y++) {
                            const i = y * columns + x;
                            if (y >= lines[x].length) {
                                data[i] = {code: 32, fg, bg}; // space
                            } else {
                                const unicode_char = lines[x].charCodeAt(y);
                                // Provide context for Arabic shaping (same as keyboard input)
                                const prevChar = y > 0 ? lines[x].charCodeAt(y - 1) : null;
                                const nextChar = y < lines[x].length - 1 ? lines[x].charCodeAt(y + 1) : null;
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char, prevChar, nextChar);
                                data[i] = {code, fg, bg};
                            }
                        }
                    }
                    break;
                    
                default:
                    // Fallback to LTR
                    columns = Math.max.apply(null, lines.map((line) => line.length));
                    rows = lines.length;
                    data = new Array(columns * rows);
                    
                    for (let y = 0, i = 0; y < rows; y++) {
                        for (let x = 0; x < columns; x++, i++) {
                            if (x >= lines[y].length) {
                                data[i] = {code: 32, fg, bg}; // space
                            } else {
                                const unicode_char = lines[y].charCodeAt(x);
                                // Provide context for Arabic shaping (same as keyboard input)
                                const prevChar = x > 0 ? lines[y].charCodeAt(x - 1) : null;
                                const nextChar = x < lines[y].length - 1 ? lines[y].charCodeAt(x + 1) : null;
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char, prevChar, nextChar);
                                data[i] = {code, fg, bg};
                            }
                        }
                    }
            }
            return {columns, rows, data};
        }
    }
}

function paste(x, y) {
    const blocks = paste_blocks();
    if (!blocks) return;
    doc.place(blocks, x, y);
}


module.exports = {copy, paste_blocks, paste};
