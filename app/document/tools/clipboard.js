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
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char);
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
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char);
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
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char);
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
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char);
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
                                const code = libtextmode.encoding_manager.unicode_to_encoding(unicode_char);
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
    if (!paste_blocks) return;
    doc.place(blocks, x, y);
}

module.exports = {copy, paste_blocks, paste};
