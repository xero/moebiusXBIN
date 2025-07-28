const electron = require("electron");
const { on, send, send_sync, msg_box, save_box, open_box } = require("./senders");
const doc = require("./document/doc");
const { tools } = require("./document/ui/ui");
const { HourlySaver } = require("./hourly_saver");
const { remove_ice_colors } = require("./libtextmode/libtextmode");
const libtextmode = require("./libtextmode/libtextmode");
let hourly_saver, backup_folder;
require("./document/ui/canvas");
require("./document/tools/select");
require("./document/tools/brush");
require("./document/tools/shifter");
require("./document/tools/line");
require("./document/tools/rectangle_filled");
require("./document/tools/rectangle_outline");
require("./document/tools/ellipse_filled");
require("./document/tools/ellipse_outline");
require("./document/tools/fill");
require("./document/tools/sample");
require("./document/tools/reference");
require("./document/input/drag_and_drop");

doc.on("start_rendering", () => send_sync("show_rendering_modal"));
doc.on("end_rendering", () => send("close_modal"));
doc.on("connecting", () => send_sync("show_connecting_modal"));
doc.on("connected", () => send("close_modal"));
doc.on("unable_to_connect", () => {
    const choice = msg_box("Connect to Server", "Cannot connect to Server", { buttons: ["Retry", "Cancel"], defaultId: 0, cancelId: 1 });
    if (choice == 1) send("destroy");
    doc.connect_to_server(doc.connection.server, doc.connection.pass);
});
doc.on("refused", () => {
    msg_box("Connect to Server", "Incorrect password!");
    send("destroy");
});
doc.on("disconnected", () => {
    const choice = msg_box("Disconnected", "You were disconnected from the server.", { buttons: ["Retry", "Cancel"], defaultId: 0, cancelId: 1 });
    if (choice == 1) send("destroy");
    doc.connect_to_server(doc.connection.server, doc.connection.pass);
});
doc.on("ready", () => {
    send("ready");
    tools.start(tools.modes.SELECT);
});

async function process_save(method = 'save', destroy_when_done = false, ignore_controlcharacters = true) {
    var ctrl = false;
    doc.data.forEach((block, index) => {
        if (block.code == 9 || block.code == 10 || block.code == 13 || block.code == 26) ctrl = true;
    });
    if (ctrl && ignore_controlcharacters == false) {
        send("show_controlcharacters", { method, destroy_when_done });
    } else {
        switch (method) {
            case "save_as":
                save_as(destroy_when_done);
                break;
            case "save_without_sauce":
                save_without_sauce();
                break;
            default:
                save(destroy_when_done);
                break;
        }
    }
}

function save(destroy_when_done = false, save_without_sauce = false) {
    if (doc.file) {
        doc.edited = false;
        doc.save(save_without_sauce);
        if (destroy_when_done) send("destroy");
    } else {
        save_as(destroy_when_done);
    }
}

async function save_as(destroy_when_done = false) {
    const file = save_box(doc.file, "xb", { filters: [{ name: "XBin", extensions: ["xb"] }, { name: "ANSI Art", extensions: ["ans", "asc", "diz", "nfo", "txt"] }, { name: "Binary Text", extensions: ["bin"] }] });
    if (!file) return;

    if (file === doc.file) {
        doc.file = file;
        doc.edited = false;
        save(destroy_when_done);
    } else {
        await doc.save_backup(file)
        await doc.open(file);
    }
}

async function save_without_sauce() {
    const file = save_box(doc.file, "xb", { filters: [{ name: "XBin", extensions: ["xb"] }, { name: "ANSI Art", extensions: ["ans", "asc", "diz", "nfo", "txt"] }, { name: "Binary Text", extensions: ["bin"] }] });
    if (!file) return;

    if (file === doc.file) {
        doc.file = file;
        doc.edited = false;
        save(false, true);
    } else {
        await doc.save_backup_without_sauce(file)
        await doc.open(file);
    }
}

async function export_font() {
    const font_height = String(doc.font_height).padStart(2, '0');
    const file = save_box(doc.file, `F${font_height}`, { filters: [{ name: "VGA font", extensions: [`F${font_height}`] }] });
    if (file)
        await doc.export_font(file);
}

async function export_font_png() {
    const font_name = doc.font_name || "font";
    const file = save_box(doc.file, font_name, { filters: [{ name: "PNG Image", extensions: ["png"] }, { name: "All Files", extensions: ["*"] }] });
    if (file)
        await doc.export_font_png(file);
}

async function share_online() {
    const url = await doc.share_online();
    if (url) electron.shell.openExternal(url);
}

async function share_online_xbin() {
    const url = await doc.share_online_xbin();
    if (url) electron.shell.openExternal(url);
}

function check_before_closing() {
    const choice = msg_box("Save this document?", "This document contains unsaved changes.", { buttons: ["Save", "Cancel", "Don't Save"], defaultId: 0, cancelId: 1 });
    if (choice == 0) {
        save(true);
    } else if (choice == 2) {
        send("destroy");
    }
}

function export_as_utf8() {
    const file = save_box(doc.file, "utf8ans", { filters: [{ name: "ANSI Art ", extensions: ["utf8ans"] }] });
    if (file) doc.export_as_utf8(file);
}

function export_as_png() {
    const file = save_box(doc.file, "png", { filters: [{ name: "Portable Network Graphics ", extensions: ["png"] }] });
    if (file) doc.export_as_png(file);
}

function export_as_apng() {
    const file = save_box(doc.file, "png", { filters: [{ name: "Animated Portable Network Graphics ", extensions: ["png"] }] });
    if (file) doc.export_as_apng(file);
}

function hourly_save() {
    if (doc.connection && !doc.connection.connected) return;
    const file = (doc.connection) ? `${doc.connection.server}.ans` : (doc.file ? doc.file : "Untitled.ans");
    const timestamped_file = hourly_saver.filename(backup_folder, file);
    doc.save_backup(timestamped_file);
    hourly_saver.keep_if_changes(timestamped_file);
}

function use_backup(value) {
    if (value) {
        hourly_saver = new HourlySaver();
        hourly_saver.start();
        hourly_saver.on("save", hourly_save);
    } else if (hourly_saver) {
        hourly_saver.stop();
    }
}

// electron.remote.getCurrentWebContents().openDevTools();
on("new_document", (event, opts) => doc.new_document(opts));
on("revert_to_last_save", (event, opts) => doc.open(doc.file));
on("show_file_in_folder", (event, opts) => electron.shell.showItemInFolder(doc.file));
on("duplicate", (event, opts) => send("new_document", { columns: doc.columns, rows: doc.rows, data: doc.data, palette: doc.palette, font_name: doc.font_name, use_9px_font: doc.use_9px_font, ice_colors: doc.ice_colors, font_bytes: doc.font_bytes }));
on("process_save", (event, { method, destroy_when_done, ignore_controlcharacters }) => process_save(method, destroy_when_done, ignore_controlcharacters));
on("save", (event, opts) => {
    if (doc.connection) {
        process_save('save_as');
    } else {
        process_save('save');
    }
});
on("save_as", (event, opts) => process_save('save_as'));
on("save_without_sauce", (event, opts) => process_save('save_without_sauce'));
on("share_online", (event, opts) => share_online());
on("open_file", (event, file) => doc.open(file));
on("open_tutorial_data", (event, {bytes, filename, title}) => {
    const tutorial_bytes = Buffer.from(bytes, 'base64');
    doc.open_tutorial_data(tutorial_bytes, filename, title);
});
on("check_before_closing", (event) => check_before_closing());
on("share_online_xbin", (event, opts) => share_online_xbin());
on("export_font", (event, opts) => export_font());
on("export_font_png", (event, opts) => export_font_png());
on("export_as_utf8", (event) => export_as_utf8());
on("export_as_png", (event) => export_as_png());
on("export_as_apng", (event) => export_as_apng());
on("remove_ice_colors", (event) => send("new_document", remove_ice_colors(doc)));
on("connect_to_server", (event, { server, pass }) => doc.connect_to_server(server, pass));
on("backup_folder", (event, folder) => backup_folder = folder);
on("use_backup", (event, value) => use_backup(value));

// F-key character set save/load functions
on("save_fkey_sets", async (event) => {
    const file = save_box(doc.file, "ans", {
        filters: [{ name: "ANSI Art", extensions: ["ans", "asc", "diz", "nfo", "txt"] }],
        defaultPath: "fkey_sets.ans"
    });
    if (!file) return;
    
    // Create 12x20 document from F-key character sets
    const fkeys = send_sync("get_fkeys"); // Get current F-key sets from preferences
    const fkey_doc = libtextmode.new_document({
        columns: 12,
        rows: 20,
        title: "Moebius F-Key Character Sets",
        author: "Moebius"
    });
    
    // Fill the document with F-key characters (12 columns x 20 rows)
    for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 12; col++) {
            const char_code = fkeys[row] && fkeys[row][col] !== undefined ? fkeys[row][col] : 32; // Use space (32) if undefined
            fkey_doc.data[row * 12 + col] = {
                code: char_code,
                fg: 7,  // White foreground
                bg: 0   // Black background
            };
        }
    }
    
    await libtextmode.write_file(fkey_doc, file);
});

on("load_fkey_sets", async (event) => {
    const file = open_box({
        filters: [{ name: "ANSI Art", extensions: ["ans", "asc", "diz", "nfo", "txt"] }, { name: "All Files", extensions: ["*"] }],
        properties: ["openFile"]
    });
    if (!file) return;
    
    try {
        const loaded_doc = await libtextmode.read_file(file[0]);
        
        // Extract F-key character sets from 12x20 grid
        const new_fkeys = [];
        for (let i = 0; i < 20; i++) {
            new_fkeys.push(new Array(12).fill(32));
        }
        
        // Extract characters from the loaded document (limit to 12x20 area)
        const max_rows = Math.min(loaded_doc.rows, 20);
        const max_cols = Math.min(loaded_doc.columns, 12);
        
        for (let row = 0; row < max_rows; row++) {
            for (let col = 0; col < max_cols; col++) {
                const index = row * loaded_doc.columns + col;
                if (index < loaded_doc.data.length && loaded_doc.data[index]) {
                    new_fkeys[row][col] = loaded_doc.data[index].code || 32;
                }
            }
        }
        
        // Update the F-key character sets
        send("set_fkeys", { fkeys: new_fkeys });
        
    } catch (error) {
        msg_box("Error loading F-key character sets: " + error.message);
    }
});

// Palette save/load functions
on("save_palette_hex", async (event) => {
    const file = save_box(doc.file, "hex", {
        filters: [{ name: "Hex Palette", extensions: ["hex"] }],
        defaultPath: "palette.hex"
    });
    if (!file) return;
    
    try {
        // Get current palette from document
        const palette = doc.palette || palette_4bit;
        
        // Convert RGB palette to hex strings
        const hex_colors = palette.map(color => {
            const r = color.r.toString(16).padStart(2, '0');
            const g = color.g.toString(16).padStart(2, '0');
            const b = color.b.toString(16).padStart(2, '0');
            return r + g + b;
        });
        
        // Write hex colors to file (one per line)
        const hex_content = hex_colors.join('\n') + '\n';
        const fs = require('fs');
        fs.writeFileSync(file, hex_content);
        
    } catch (error) {
        msg_box("Error saving palette: " + error.message);
    }
});

on("load_palette_hex", async (event) => {
    const files = open_box({
        filters: [{ name: "Hex Palette", extensions: ["hex"] }, { name: "All Files", extensions: ["*"] }],
        properties: ["openFile"]
    });
    if (!files || !files[0]) return;
    
    try {
        const fs = require('fs');
        const content = fs.readFileSync(files[0], 'utf8');
        
        // Parse hex colors from file
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const hex_colors = [];
        
        for (const line of lines) {
            // Skip comments and empty lines
            if (line.startsWith('#') || line.startsWith('//') || line.length === 0) continue;
            
            // Extract hex color (remove # if present)
            let hex = line.replace('#', '').trim();
            
            // Validate hex format (6 characters)
            if (hex.length === 6 && /^[0-9A-Fa-f]+$/.test(hex)) {
                hex_colors.push(hex);
            }
        }
        
        if (hex_colors.length === 0) {
            msg_box("No valid hex colors found in file");
            return;
        }
        
        // Update document palette using proper API
        for (let i = 0; i < 16; i++) {
            if (i < hex_colors.length) {
                const hex = hex_colors[i];
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                doc.update_palette(i, { r, g, b });
            } else {
                // Fill remaining slots with black
                doc.update_palette(i, { r: 0, g: 0, b: 0 });
            }
        }
        
        // Update swatches and trigger re-rendering
        doc.emit("update_swatches");
        await doc.start_rendering();
        
    } catch (error) {
        msg_box("Error loading palette: " + error.message);
    }
});
