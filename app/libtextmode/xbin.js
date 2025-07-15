const { bytes_to_utf8, bytes_to_blocks, Textmode, add_sauce_for_xbin } = require("./textmode");
const { palette_4bit, xbin_to_rgb, rgb_to_xbin } = require("./palette");
const repeating = { NONE: 0, CHARACTERS: 1, ATTRIBUTES: 2, BOTH_CHARACTERS_AND_ATTRIBUTES: 3 };
const { encode_as_bin } = require("./binary_text");

function uncompress({ bytes, columns, rows }) {
    const data = new Array(columns * rows);
    for (let i = 0, j = 0; i < bytes.length;) {
        const value = bytes[i++];
        const count = value & 63;
        switch (value >> 6) {
            case repeating.NONE:
                for (let k = 0; k <= count; i += 2, j++, k++) {
                    data[j] = { code: bytes[i], bg: bytes[i + 1] >> 4, fg: bytes[i + 1] & 0xf };
                }
                break;
            case repeating.CHARACTERS:
                for (let k = 0, code = bytes[i++]; k <= count; i++, k++, j++) {
                    data[j] = { code, bg: bytes[i] >> 4, fg: bytes[i] & 0xf };
                }
                break;
            case repeating.ATTRIBUTES:
                for (let k = 0, bg = bytes[i] >> 4, fg = bytes[i++] & 0xf; k <= count; i++, j++, k++) {
                    data[j] = { code: bytes[i], bg, fg };
                }
                break;
            case repeating.BOTH_CHARACTERS_AND_ATTRIBUTES:
                for (let k = 0, code = bytes[i++], bg = bytes[i] >> 4, fg = bytes[i++] & 0xf; k <= count; j++, k++) {
                    data[j] = { code, bg, fg };
                }
                break;
        }
    }
    return data;
}

class XBin extends Textmode {
    constructor(bytes) {
        super(bytes);
        if (bytes_to_utf8(this.bytes, 0, 4) != "XBIN" | this.bytes[4] != 0x1A) {
            throw ("Error whilst attempting to load XBin file: Unexpected header.");
        }
        this.columns = (this.bytes[6] << 8) + this.bytes[5];
        this.rows = (this.bytes[8] << 8) + this.bytes[7];
        this.font_height = this.bytes[9] || 16;
        const flags = this.bytes[10];
        const palette_flag = (flags & 1) == 1;
        const font_flag = (flags >> 1 & 1) == 1;
        const compress_flag = (flags >> 2 & 1) == 1;
        this.ice_colors = (flags >> 3 & 1) == 1;
        const font_512_flag = (flags >> 4 & 1) == 1;
        if (font_512_flag) {
            throw ("Error whilst attempting to load XBin file: Unsupported font size.");
        }
        let i = 11;
        if (palette_flag) {
            const palette_bytes = this.bytes.subarray(11, 11 + 48);
            this.palette = new Array(16);
            for (let i = 0, j = 0; i < 16; i++, j += 3) {
                this.palette[i] = xbin_to_rgb(palette_bytes[j], palette_bytes[j + 1], palette_bytes[j + 2]);
            }
            i += 48;
        } else {
            this.palette = palette_4bit;
        }
        if (font_flag) {
            this.font_name = "Custom";
            this.font_bytes = this.bytes.subarray(i, i + 256 * this.font_height);
            i += 256 * this.font_height;
        }
        if (compress_flag) {
            this.data = uncompress({ columns: this.columns, rows: this.rows, bytes: this.bytes.subarray(i, i + this.filesize) });
        } else {
            this.data = bytes_to_blocks({ columns: this.columns, rows: this.rows, bytes: this.bytes.subarray(i, i + this.filesize) });
        }
    }
}


function encode_as_xbin(doc, save_without_sauce) {
    // Convert document to binary format
    const bin_bytes = encode_as_bin(doc, true, true);
    
    // XBIN format constants
    const XBIN_MAGIC = [88, 66, 73, 78, 26]; // "XBIN" + EOF marker
    const FLAG_PALETTE = 1;      // Bit 0: Has palette
    const FLAG_FONT = 1 << 1;    // Bit 1: Has font
    const FLAG_ICE_COLORS = 1 << 3; // Bit 3: Uses ice colors
    
    // Build base header with magic bytes, dimensions, and font height
    const header = [
        ...XBIN_MAGIC,
        doc.columns & 255,        // Low byte of columns
        doc.columns >> 8,         // High byte of columns  
        doc.rows & 255,           // Low byte of rows
        doc.rows >> 8,            // High byte of rows
        doc.font_height,          // Font height in pixels
        0                         // Flags byte (will be updated below)
    ];
    
    let flags = 0;
    let additional_data = [];
    
    // Add palette data if present
    if (doc.palette) {
        flags |= FLAG_PALETTE;
        
        const palette_bytes = [];
        for (const rgb_color of doc.palette) {
            palette_bytes.push(...rgb_to_xbin(rgb_color));
        }
        additional_data.push(...palette_bytes);
    }
    
    // Add font data (either custom font or embedded font bytes)
    if (doc.font != null) {
        flags |= FLAG_FONT;
        
        // Use custom font loaded in program
        const font_bytes = [...doc.font.bitmask];
        additional_data.push(...font_bytes);
    } else {
        flags |= FLAG_FONT;
        
        // Use font from XBIN file
        const font_bytes = [...doc.font_bytes];
        additional_data.push(...font_bytes);
    }
    
    // Set ice colors flag if enabled
    if (doc.ice_colors) {
        flags |= FLAG_ICE_COLORS;
    }
    
    // Update flags in header
    header[10] = flags;
    
    // Combine header with additional data
    const complete_header = [...header, ...additional_data];
    
    // Create final byte array
    const total_length = complete_header.length + bin_bytes.length;
    const bytes = new Uint8Array(total_length);
    
    bytes.set(complete_header, 0);
    bytes.set(bin_bytes, complete_header.length);
    
    // Add SAUCE metadata if requested
    if (!save_without_sauce) {
        return add_sauce_for_xbin({ doc, bytes });
    }
    
    return bytes;
}

module.exports = { XBin, encode_as_xbin };
