const electron = require("electron");
const events = new require("events");
const darwin = (process.platform == "darwin");
const menus = [];
const chat_menus = [];
const font_names = [];
// Import font lists from centralized registry
const { font_list, viler_font_list, custom_font_list } = require("./font_registry");
const lospec_palette_names = [];
const lospec_palette_list = {
    "Isolated16": "Isolated16",
    "AJMSX": "AJMSX",
    "link awakening : links colour": "link awakening : links colour",
    "MICROSOFT VGA": "MICROSOFT VGA",
    "Corruption-16": "Corruption-16",
    "Sweetie 16": "Sweetie 16",
    "Steam Lords": "Steam Lords",
    "NA16": "NA16",
    "Island Joy 16": "Island Joy 16",
    "PICO-8": "PICO-8",
    "Bubblegum 16": "Bubblegum 16",
    "Lost Century": "Lost Century",
    "Endesga 16": "Endesga 16",
    "vanilla milkshake": "vanilla milkshake",
    "Galaxy Flame": "Galaxy Flame",
    "DawnBringer 16": "DawnBringer 16",
    "Microsoft Windows": "Microsoft Windows",
    "Taffy 16": "Taffy 16",
    "Commodore 64": "Commodore 64",
    "antiquity16": "antiquity16",
    "Go-line": "Go-line",
    "Color Graphics Adapter": "Color Graphics Adapter",
    "16 Bital": "16 Bital",
    "ARQ16": "ARQ16",
    "Punolite": "Punolite",
    "Nanner 16": "Nanner 16",
    "colorquest-16": "colorquest-16",
    "Cretaceous-16": "Cretaceous-16",
    "Cthulhu 16": "Cthulhu 16",
    "Summers Past-16": "Summers Past-16",
    "Nanner Jam": "Nanner Jam",
    "Flowers": "Flowers",
    "SHIDO CYBERNEON": "SHIDO CYBERNEON",
    "Forest-16": "Forest-16",
    "Peachy Pop 16": "Peachy Pop 16",
    "retrobubble.": "retrobubble.",
    "Fading 16": "Fading 16",
    "AAP-16": "AAP-16",
    "Triton 16": "Triton 16",
    "URBEX 16": "URBEX 16",
    "Oxygen 16": "Oxygen 16",
    "Soldier 16": "Soldier 16",
    "Colodore": "Colodore",
    "Versitle 16": "Versitle 16",
    "Endesga Soft 16": "Endesga Soft 16",
    "retro_cal": "retro_cal",
    "Skedd16": "Skedd16",
    "Europa 16": "Europa 16",
    "prospec_cal": "prospec_cal",
    "Cookiebox-16": "Cookiebox-16",
    "colorquest (retro recolor)": "colorquest (retro recolor)",
    "PP-16": "PP-16",
    "Darkseed 16": "Darkseed 16",
    "mystic-16": "mystic-16",
    "PICO-DB": "PICO-DB",
    "Tauriel-16": "Tauriel-16",
    "FZT Ethereal 16": "FZT Ethereal 16",
    "Bloom 16": "Bloom 16",
    "Commodore VIC-20": "Commodore VIC-20",
    "JONK 16": "JONK 16",
    "Macintosh II": "Macintosh II",
    "eteRN16": "eteRN16",
    "Explorers16": "Explorers16",
    "Smooth 16": "Smooth 16",
    "System Mini 16": "System Mini 16",
    "Shine 16": "Shine 16",
    "WinterFes 16": "WinterFes 16",
    "Sk 16": "Sk 16",
    "Melody 16": "Melody 16",
    "Lump 16": "Lump 16",
    "Harpy 16": "Harpy 16",
    "Combi 16": "Combi 16",
    "Doomed": "Doomed",
    "Magik16": "Magik16",
    "PYXEL": "PYXEL",
    "Colorblind 16": "Colorblind 16",
    "Autumn": "Autumn",
    "Lemon 16": "Lemon 16",
    "SimpleJPC-16": "SimpleJPC-16",
    "Nord theme": "Nord theme",
    "Colodore VIC-64": "Colodore VIC-64",
    "Griefwards and through": "Griefwards and through",
    "ENOS16": "ENOS16",
    "Ultima VI Atari ST": "Ultima VI Atari ST",
    "psyche16": "psyche16",
    "ADB hybrid 16": "ADB hybrid 16",
    "Mappletosh 16": "Mappletosh 16",
    "Just add water": "Just add water",
    "Damage Dice 10 & 6": "Damage Dice 10 & 6",
    "Hasty Rainbow 4bit": "Hasty Rainbow 4bit",
    "vampire-16": "vampire-16",
    "Loop Hero": "Loop Hero",
    "Astron ST16": "Astron ST16",
    "Lovey-Dovey 16": "Lovey-Dovey 16",
    "Jr-Comp": "Jr-Comp",
    "Ye Olde Pirate Modde": "Ye Olde Pirate Modde",
    "trk-losat-16": "trk-losat-16",
    "The Perfect Palette pocket": "The Perfect Palette pocket",
    "WILSON16": "WILSON16",
    "Zeitgeist16": "Zeitgeist16",
    "AGC16": "AGC16",
    "Natural Colour System 16": "Natural Colour System 16",
    "drowsy 16": "drowsy 16",
    "Minecraft Wool": "Minecraft Wool",
    "Deep 16": "Deep 16",
    "Deep Forest 16": "Deep Forest 16",
    "Huc 16": "Huc 16",
    "Thanksmas 16": "Thanksmas 16",
    "king-16": "king-16",
    "Pastel Love": "Pastel Love",
    "BPRD-16": "BPRD-16",
    "V.O.S.P ": "V.O.S.P ",
    "Rayleigh": "Rayleigh",
    "Old Christmas": "Old Christmas",
    "Jr-16": "Jr-16",
    "Tropical Chancer": "Tropical Chancer",
    "GRAYSCALE 16": "GRAYSCALE 16",
    "Ladder 5": "Ladder 5",
    "Shifty16": "Shifty16",
    "super pocket boy": "super pocket boy",
    "Sweets-16": "Sweets-16",
    "Limted-16": "Limted-16",
    "Astro16-v2": "Astro16-v2",
    "RGGB 4-bit color palette": "RGGB 4-bit color palette",
    "Transit": "Transit",
    "Arctic Level": "Arctic Level",
    "Intellivision": "Intellivision",
    "fourbit": "fourbit",
    "Washed-Over 16": "Washed-Over 16",
    "Colorbit-16": "Colorbit-16",
    "The Amazing Spider-Man": "The Amazing Spider-Man",
    "Bounce-16": "Bounce-16",
    "JW-64": "JW-64",
    "Light Fantasy Game": "Light Fantasy Game",
    "Doodle 16": "Doodle 16",
    "ANDREW KENSLER 16 (STYLIZED)": "ANDREW KENSLER 16 (STYLIZED)",
    "the16wonder": "the16wonder",
    "VNES-16 PALETTE": "VNES-16 PALETTE",
    "Campbell (New Windows Console)": "Campbell (New Windows Console)",
    "Pastry Shop": "Pastry Shop",
    "Super Cassette Vision": "Super Cassette Vision",
    "BoldSouls16": "BoldSouls16",
    "MG16": "MG16",
    "Minecraft Concrete": "Minecraft Concrete",
    "Rabbit Jump": "Rabbit Jump",
    "Spiral 16": "Spiral 16",
    "NanoC-16": "NanoC-16",
    "Brenyon's Rainbow": "Brenyon's Rainbow",
    "Crayon16": "Crayon16",
    "Chip's Challenge Amiga/Atari ST": "Chip's Challenge Amiga/Atari ST",
    "16Dan": "16Dan",
    "LucasArts Atari ST": "LucasArts Atari ST",
    "4-Bit RGB": "4-Bit RGB",
    "A.J.'s Pico-8 Palette": "A.J.'s Pico-8 Palette",
    "Minecraft Dyes": "Minecraft Dyes",
    "Proto 64": "Proto 64",
    "Softboy 16": "Softboy 16",
    "Cartooners": "Cartooners",
    "Pastari16": "Pastari16",
    "Huemeister": "Huemeister",
    "Ultima VI Sharp X68000 ": "Ultima VI Sharp X68000 ",
    "HWAYS-16": "HWAYS-16",
    "Vibrant ramps": "Vibrant ramps",
    "PAC-16": "PAC-16",
    "Random16": "Random16",
    "LovePal 16": "LovePal 16",
    "NYANKOS16": "NYANKOS16",
    "Sierra Adventures Atari ST": "Sierra Adventures Atari ST",
    "Race You Home!": "Race You Home!",
    "Baby Jo in \"Going Home\"": "Baby Jo in \"Going Home\"",
    "Ice Cream 16": "Ice Cream 16",
    "Andrew Kensler's 16": "Andrew Kensler's 16",
    "Krzywinski Colorblind 16": "Krzywinski Colorblind 16",
    "Supaplex": "Supaplex",
    "QAOS Minimalist 16": "QAOS Minimalist 16",
    "DOS's Gloomy Gloss": "DOS's Gloomy Gloss",
    "Newer Graphics Adapter": "Newer Graphics Adapter",
    "Super Breakout ST": "Super Breakout ST",
    "another retro": "another retro",
    "JMP (Japanese Machine Palette)": "JMP (Japanese Machine Palette)",
    "Eroge Copper": "Eroge Copper",
    "Castpixel 16": "Castpixel 16",
    "Fantasy 16": "Fantasy 16",
    "Psygnosia": "Psygnosia",
    "DinoKnight 16": "DinoKnight 16",
    "Chromatic16": "Chromatic16",
    "Arne 16": "Arne 16",
    "CGArne": "CGArne",
    "Copper Tech": "Copper Tech",
    "/r/Place": "/r/Place",
    "Night 16": "Night 16",
    "ZXArne 5.2": "ZXArne 5.2",
    "Easter Island": "Easter Island",
    "A64": "A64",
    "Grunge Shift": "Grunge Shift",
    "Fun16": "Fun16",
    "cm16": "cm16",
    "FlyGuy 16": "FlyGuy 16",
    "[thUg] 16": "[thUg] 16",
    "Naji 16": "Naji 16",
    "Andrew Kensler 16": "Andrew Kensler 16",
    "Crimso 11": "Crimso 11",
    "Chip16": "Chip16",
    "RISC OS": "RISC OS",
    "CD-BAC": "CD-BAC",
    "Super17 16": "Super17 16",
    "Master-16": "Master-16",
    "Drazile 16": "Drazile 16",
    "Optimum": "Optimum",
    "pavanz 16": "pavanz 16",
    "Thomson M05": "Thomson M05",
};

const moebius_menu = {
    label: "Mœbius",
    submenu: [
        { role: "about", label: "About Mœbius" },
        { type: "separator" },
        { label: "Preferences", id: "preferences", accelerator: "CmdorCtrl+,", click(item) { event.emit("preferences"); } },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide", label: "Hide Mœbius" },
        { role: "hideothers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "Quit Mœbius" }
    ]
};

const bare_file = {
    label: "File",
    submenu: [
        { role: "close" }
    ]
};

const bare_edit = {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "Cmd+Z", role: "undo" },
        { label: "Redo", accelerator: "Cmd+Shift+Z", role: "redo" },
        { type: "separator" },
        { label: "Cut", accelerator: "Cmd+X", role: "cut" },
        { label: "Copy", accelerator: "Cmd+C", role: "copy" },
        { label: "Paste", accelerator: "Cmd+V", role: "paste" },
        { label: "Select All", accelerator: "Cmd+A", role: "selectall" }
    ]
};

const window_menu_items = {
    label: "Window",
    submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" }
    ]
};

const help_menu_items = {
    label: "Help", role: "help", submenu: [
        { label: "Guide for MoebiusXBIN editor", id: "xbin_tutorial", click(item) { electron.shell.openExternal("https://blog.glyphdrawing.club/moebius-ansi-and-ascii-art-editor-with-custom-font-support/"); } },
        { label: "MoebiusXBIN at GitHub", id: "show_repo", click(item) { electron.shell.openExternal("https://github.com/hlotvonen/moebius/"); } },
        { type: "separator" },
        { label: "How to Start a Server", id: "show_repo", click(item) { electron.shell.openExternal("https://github.com/blocktronics/moebius/blob/master/README.md#moebius-server"); } },
        { label: "Enable Function Keys on MacOS", id: "enable_function_keys", click(item) { electron.shell.openExternal("file:///System/Library/PreferencePanes/Keyboard.prefPane/"); }, enabled: darwin },
        { type: "separator" },
        { label: "Cheatsheet", id: "show_cheatsheet", click(item) { event.emit("show_cheatsheet"); } },
        { label: "Show Numpad Mappings", id: "show_numpad_mappings", click(item) { event.emit("show_numpad_mappings"); } },
        { type: "separator" },
        { label: "Acknowledgements", id: "show_acknowledgements", click(item) { event.emit("show_acknowledgements"); } },
        { type: "separator" },
        { label: "ANSI Art Tutorials at 16Colors", id: "changelog", click(item) { electron.shell.openExternal("https://16colo.rs/tags/content/tutorial"); } },
        { label: "Mœbius Homepage", id: "show_homepage", click(item) { electron.shell.openExternal("https://blocktronics.github.io/moebius/"); } },
        { label: "Original Source Code at GitHub", id: "show_repo", click(item) { electron.shell.openExternal("https://github.com/blocktronics/moebius"); } },
        { label: "Raise an Issue at GitHub", id: "show_issues", click(item) { electron.shell.openExternal("https://github.com/blocktronics/moebius/issues"); } },
        { type: "separator" },
        { label: "Changelog", id: "changelog", click(item) { event.emit("show_changelog"); } },
    ]
};

const application = electron.Menu.buildFromTemplate([moebius_menu, {
    label: "File",
    submenu: [
        { label: "New", id: "new_document", accelerator: "Cmd+N", click(item) { event.emit("new_document"); } },
        { type: "separator" },
        { label: "Open\u2026", id: "open", accelerator: "Cmd+O", click(item) { event.emit("open"); } },
        { type: "separator" },
        { role: "close" },
    ]
}, bare_edit, {
        label: "Network", submenu: [
            { label: "Connect to Server…", accelerator: "Cmd+Alt+S", id: "connect_to_server", click(item) { event.emit("show_new_connection_window"); } },
        ]
    }, window_menu_items, help_menu_items
]);

function file_menu_template(win) {
    return {
        label: "&File",
        submenu: [
            { label: "New", id: "new_document", accelerator: "CmdorCtrl+N", click(item) { event.emit("new_document"); } },
            { label: "Duplicate as New Document", id: "duplicate", click(item) { win.send("duplicate"); } },
            { type: "separator" },
            { label: "Open\u2026", id: "open", accelerator: "CmdorCtrl+O", click(item) { event.emit("open", win); } },
            { label: "Open in Current Window\u2026", id: "open_in_current_window", accelerator: "CmdorCtrl+Shift+O", click(item) { event.emit("open_in_current_window", win); } },
            { type: "separator" },
            { label: "Revert to Last Save", id: "revert_to_last_save", click(item) { win.send("revert_to_last_save"); }, enabled: false },
            { label: "Show File in Folder", id: "show_file_in_folder", click(item) { win.send("show_file_in_folder"); }, enabled: false },
            { type: "separator" },
            { label: "Edit Sauce Info\u2026", id: "edit_sauce_info", accelerator: "CmdorCtrl+I", click(item) { win.send("get_sauce_info"); } },
            { type: "separator" },
            { label: "Save", id: "save", accelerator: "CmdorCtrl+S", click(item) { win.send("save"); } },
            { label: "Save As\u2026", id: "save_as", accelerator: "CmdorCtrl+Shift+S", click(item) { win.send("save_as"); } },
            { label: "Save Without Sauce Info\u2026", id: "save_without_sauce", click(item) { win.send("save_without_sauce"); } },
            { type: "separator" },
            { label: "Share Online", id: "share_online", click(item) { win.send("share_online"); } },
            { label: "Share Online (XBIN)", id: "share_online_xbin", click(item) { win.send("share_online_xbin"); } },
            { type: "separator" },
            { label: "Export As PNG\u2026", id: "export_as_png", accelerator: "CmdorCtrl+Shift+E", click(item) { win.send("export_as_png"); } },
            { label: "Export As Animated PNG\u2026", id: "export_as_apng", accelerator: "CmdorCtrl+Shift+A", click(item) { win.send("export_as_apng"); } },
            { type: "separator" },
            { label: "Export As UTF-8\u2026", id: "export_as_utf8", accelerator: "CmdorCtrl+Shift+U", click(item) { win.send("export_as_utf8"); } },
            { type: "separator" },
            { label: "Save F-Key Character Sets\u2026", id: "save_fkey_sets", click(item) { win.send("save_fkey_sets"); } },
            { label: "Load F-Key Character Sets\u2026", id: "load_fkey_sets", click(item) { win.send("load_fkey_sets"); } },
            { type: "separator" },
            { role: "close", accelerator: darwin ? "Cmd+W" : "Alt+F4" }
        ]
    };
}

function edit_menu_template(win, chat) {
    return {
        label: "&Edit",
        submenu: [
            chat ? { label: "Undo", accelerator: "Cmd+Z", role: "undo" } : { label: "Undo", id: "undo", accelerator: darwin ? "CmdorCtrl+Z" : "", click(item) { win.send("undo"); }, enabled: false },
            chat ? { label: "Redo", accelerator: "Cmd+Shift+Z", role: "redo" } : { label: "Redo", id: "redo", accelerator: darwin ? "CmdorCtrl+Shift+Z" : "", click(item) { win.send("redo"); }, enabled: false },
            { type: "separator" },
            { label: "Toggle Insert Mode", id: "toggle_insert_mode", accelerator: darwin ? "" : "Insert", type: "checkbox", click(item) { win.send("insert_mode", item.checked); }, checked: false },
            { label: "Toggle Overwrite Mode", id: "overwrite_mode", accelerator: "CmdorCtrl+Alt+O", click(item) { win.send("overwrite_mode", item.checked); }, type: "checkbox", checked: false },
            { type: "separator" },
            { label: "Mirror Mode", id: "mirror_mode", accelerator: "CmdorCtrl+Alt+M", click(item) { win.send("mirror_mode", item.checked); }, type: "checkbox", checked: false },
            { type: "separator" },
            chat ? { label: "Cut", accelerator: "Cmd+X", role: "cut" } : { label: "Cut", id: "cut", accelerator: "CmdorCtrl+X", click(item) { win.send("cut"); }, enabled: false },
            chat ? { label: "Copy", accelerator: "Cmd+C", role: "copy" } : { label: "Copy", id: "copy", accelerator: "CmdorCtrl+C", click(item) { win.send("copy"); }, enabled: false },
            chat ? { label: "Paste", accelerator: "Cmd+V", role: "paste" } : { label: "Paste", id: "paste", accelerator: "CmdorCtrl+V", click(item) { win.send("paste"); }, enabled: true },
            { label: "Paste As Selection", id: "paste_as_selection", accelerator: "CmdorCtrl+Alt+V", click(item) { win.send("paste_as_selection"); }, enabled: true },
            { type: "separator" },
            { label: "Left Justify Line", id: "left_justify_line", accelerator: "Alt+L", click(item) { win.send("left_justify_line"); }, enabled: true },
            { label: "Right Justify Line", id: "right_justify_line", accelerator: "Alt+R", click(item) { win.send("right_justify_line"); }, enabled: true },
            { label: "Center Line", id: "center_line", accelerator: "Alt+C", click(item) { win.send("center_line"); }, enabled: true },
            { type: "separator" },
            { label: "Insert Row", id: "insert_row", accelerator: "Alt+Up", click(item) { win.send("insert_row"); }, enabled: true },
            { label: "Delete Row", id: "delete_row", accelerator: "Alt+Down", click(item) { win.send("delete_row"); }, enabled: true },
            { type: "separator" },
            { label: "Insert Column", id: "insert_column", accelerator: "Alt+Right", click(item) { win.send("insert_column"); }, enabled: true },
            { label: "Delete Column", id: "delete_column", accelerator: "Alt+Left", click(item) { win.send("delete_column"); }, enabled: true },
            { type: "separator" },
            { label: "Erase Row", id: "erase_line", accelerator: "Alt+E", click(item) { win.send("erase_line"); }, enabled: true },
            { label: "Erase to Start of Row", id: "erase_to_start_of_line", accelerator: "Alt+Home", click(item) { win.send("erase_to_start_of_line"); }, enabled: true },
            { label: "Erase to End of Row", id: "erase_to_end_of_line", accelerator: "Alt+End", click(item) { win.send("erase_to_end_of_line"); }, enabled: true },
            { type: "separator" },
            { label: "Erase Column", id: "erase_column", accelerator: "Alt+Shift+E", click(item) { win.send("erase_column"); }, enabled: true },
            { label: "Erase to Start of Column", id: "erase_to_start_of_column", accelerator: "Alt+PageUp", click(item) { win.send("erase_to_start_of_column"); }, enabled: true },
            { label: "Erase to End of Column", id: "erase_to_end_of_column", accelerator: "Alt+PageDown", click(item) { win.send("erase_to_end_of_column"); }, enabled: true },
            { type: "separator" },
            { label: "Scroll Canvas Up", id: "scroll_canvas_up", accelerator: "Ctrl+Alt+Up", click(item) { win.send("scroll_canvas_up"); }, enabled: true },
            { label: "Scroll Canvas Down", id: "scroll_canvas_down", accelerator: "Ctrl+Alt+Down", click(item) { win.send("scroll_canvas_down"); }, enabled: true },
            { label: "Scroll Canvas Right", id: "scroll_canvas_right", accelerator: "Ctrl+Alt+Right", click(item) { win.send("scroll_canvas_right"); }, enabled: true },
            { label: "Scroll Canvas Left", id: "scroll_canvas_left", accelerator: "Ctrl+Alt+Left", click(item) { win.send("scroll_canvas_left"); }, enabled: true },
            { type: "separator" },
            { label: "Set Canvas Size\u2026", id: "set_canvas_size", accelerator: "CmdorCtrl+Alt+C", click(item) { win.send("get_canvas_size"); }, enabled: true },
        ]
    };
}

function selection_menu_template(win, chat) {
    return {
        label: "&Selection",
        submenu: [
            chat ? { label: "Select All", accelerator: "Cmd+A", role: "selectall" } : { label: "Select All", id: "select_all", accelerator: "CmdorCtrl+A", click(item) { win.send("select_all"); } },
            { label: "Deselect", id: "deselect", click(item) { win.send("deselect"); }, enabled: false },
            { type: "separator" },
            { label: "Import\u2026", id: "import_selection", click(item) { win.send("import_selection"); } },
            { label: "Export\u2026", id: "export_selection", click(item) { win.send("export_selection"); }, enabled: false },
            { type: "separator" },
            { label: "Start Selection", id: "start_selection", accelerator: "Alt+B", click(item) { win.send("start_selection"); }, enabled: false },
            { type: "separator" },
            { label: "Move Block", id: "move_block", accelerator: "M", click(item) { win.send("move_block"); }, enabled: false },
            { label: "Copy Block", id: "copy_block", accelerator: "C", click(item) { win.send("copy_block"); }, enabled: false },
            { type: "separator" },
            { label: "Fill", id: "fill", accelerator: "F", click(item) { win.send("fill"); }, enabled: false },
            { label: "Erase", id: "erase", accelerator: "E", click(item) { win.send("erase"); }, enabled: false },
            { label: "Stamp", id: "stamp", accelerator: "S", click(item) { win.send("stamp"); }, enabled: false },
            { label: "Place", id: "place", accelerator: "Enter", click(item) { win.send("place"); }, enabled: false },
            { label: "Rotate", id: "rotate", accelerator: "R", click(item) { win.send("rotate"); }, enabled: false },
            { label: "Flip X", id: "flip_x", accelerator: "X", click(item) { win.send("flip_x"); }, enabled: false },
            { label: "Flip Y", id: "flip_y", accelerator: "Y", click(item) { win.send("flip_y"); }, enabled: false },
            { label: "Center", id: "center", accelerator: "=", click(item) { win.send("center"); }, enabled: false },
            { type: "separator" },
            { label: "Transparent", id: "transparent", accelerator: "T", click(item) { win.send("transparent", item.checked); }, type: "checkbox", checked: false, enabled: false },
            { label: "Over", id: "over", accelerator: "O", click(item) { win.send("over", item.checked); }, type: "checkbox", checked: false, enabled: false },
            { label: "Underneath", id: "underneath", accelerator: "U", click(item) { win.send("underneath", item.checked); }, type: "checkbox", checked: false, enabled: false },
            { type: "separator" },
            { label: "Crop", id: "crop", accelerator: "CmdorCtrl+K", click(item) { win.send("crop"); }, enabled: false },
        ]
    };
}

function lospec_palette_menu_items(win) {
    return Object.keys(lospec_palette_list).map((lospec_palette_name) => {
        return { label: lospec_palette_name, id: lospec_palette_name, click(item) { win.send("change_palette", lospec_palette_name); }, type: "checkbox", checked: false };
    });
}

function viler_font_menu_items(win) {
    return Object.keys(viler_font_list).map((menu_title) => {
        return {
            label: menu_title, submenu: Object.keys(viler_font_list[menu_title]).map((font_name) => {
                return { label: font_name, id: font_name, click(item) { win.send("change_font", font_name); }, type: "checkbox", checked: false };
            })
        };
    });
}

function custom_font_menu_items(win) {
    return Object.keys(custom_font_list).map((menu_title) => {
        return {
            label: menu_title, submenu: Object.keys(custom_font_list[menu_title]).map((font_name) => {
                return { label: font_name, id: font_name, click(item) { win.send("change_font", font_name); }, type: "checkbox", checked: false };
            })
        };
    });
}

function font_menu_items(win) {
    return Object.keys(font_list).map((menu_title) => {
        return {
            label: menu_title, submenu: Object.keys(font_list[menu_title]).map((font_name) => {
                return { label: `${font_name} (8×${font_list[menu_title][font_name]})`, id: font_name, click(item) { win.send("change_font", font_name); }, type: "checkbox", checked: false };
            })
        };
    });
}

function view_menu_template(win) {
    return {
        label: "&View",
        submenu: [
            { label: "Keyboard Mode", id: "change_to_select_mode", accelerator: "K", click(item) { win.send("change_to_select_mode"); }, enabled: false },
            { label: "Brush Mode", id: "change_to_brush_mode", accelerator: "B", click(item) { win.send("change_to_brush_mode"); }, enabled: false },
            { label: "Shifter Mode", id: "change_to_shifter_mode", accelerator: "I", click(item) { win.send("change_to_shifter_mode"); }, enabled: false },
            { label: "Paintbucket Mode", id: "change_to_fill_mode", accelerator: "P", click(item) { win.send("change_to_fill_mode"); }, enabled: false },
            { type: "separator" },
            { label: "Show Status Bar", id: "show_status_bar", accelerator: "CmdorCtrl+/", click(item) { win.send("show_statusbar", item.checked); }, type: "checkbox", checked: true },
            { label: "Show Tool Bar", id: "show_tool_bar", accelerator: "CmdorCtrl+T", click(item) { win.send("show_toolbar", item.checked); }, type: "checkbox", checked: true },
            { label: "Hide Preview", id: "show_preview", accelerator: "CmdorCtrl+Alt+P", click(item) { win.send("show_preview", item.checked); }, type: "checkbox", checked: false },
            { type: "separator" },
            { label: "Previous Character Set", id: "previous_character_set", accelerator: "Ctrl+,", click(item) { win.send("previous_character_set"); }, enabled: true },
            { label: "Next Character Set", id: "next_character_set", accelerator: "Ctrl+.", click(item) { win.send("next_character_set"); }, enabled: true },
            { label: "Default Character Set", id: "default_character_set", accelerator: "Ctrl+/", click(item) { win.send("default_character_set"); }, enabled: true },
            { type: "separator" },
            { label: "Increase Brush Size", id: "increase_brush_size", accelerator: "Alt+=", click(item) { win.send("increase_brush_size"); }, enabled: false },
            { label: "Decrease Brush Size", id: "decrease_brush_size", accelerator: "Alt+-", click(item) { win.send("decrease_brush_size"); }, enabled: false },
            { label: "Reset Brush Size", id: "reset_brush_size", accelerator: "Alt+0", click(item) { win.send("reset_brush_size"); }, enabled: false },
            { type: "separator" },
            { label: "View canvas at 200%", id: "canvas_zoom_toggle", accelerator: "CmdorCtrl+Alt+2", click(item) { win.send("canvas_zoom_toggle"); }, type: "checkbox", checked: false },
            { label: "Actual Size", id: "actual_size", accelerator: "CmdorCtrl+Alt+0", click(item) { win.send("actual_size"); }, type: "checkbox", checked: false },
            { label: "Zoom In", id: "zoom_in", accelerator: "CmdorCtrl+=", click(item) { win.send("zoom_in"); } },
            { label: "Zoom Out", id: "zoom_out", accelerator: "CmdorCtrl+-", click(item) { win.send("zoom_out"); } },
            { type: "separator" },
            {
                label: "Guides", submenu: [
                    { label: "Middle Line", id: "middle_guide", click(item) { win.send("toggle_middle_guide", item.checked); }, type: "checkbox", checked: false },
                    { type: "separator" },
                    { label: "Smallscale (80×25)", id: "smallscale_guide", click(item) { win.send("toggle_smallscale_guide", item.checked); }, type: "checkbox", checked: false },
                    { label: "Square (80×40)", id: "square_guide", click(item) { win.send("toggle_square_guide", item.checked); }, type: "checkbox", checked: false },
                    { label: "Instagram (80×50)", id: "instagram_guide", click(item) { win.send("toggle_instagram_guide", item.checked); }, type: "checkbox", checked: false },
                    { label: "File ID (44×22)", id: "file_id_guide", click(item) { win.send("toggle_file_id_guide", item.checked); }, type: "checkbox", checked: false },
                    { label: "PETSCII (40×25)", id: "petscii_guide", click(item) { win.send("toggle_petscii_guide", item.checked); }, type: "checkbox", checked: false },
                    {
                        label: "Drawing grid", submenu: [
                            { label: "1x1", id: "drawinggrid_1x1", click(item) { win.send("toggle_drawinggrid", item.checked, 1); }, type: "checkbox", checked: false },
                            { label: "4x2", id: "drawinggrid_4x2", click(item) { win.send("toggle_drawinggrid", item.checked, 4); }, type: "checkbox", checked: false },
                            { label: "6x3", id: "drawinggrid_6x3", click(item) { win.send("toggle_drawinggrid", item.checked, 6); }, type: "checkbox", checked: false },
                            { label: "8x4", id: "drawinggrid_8x4", click(item) { win.send("toggle_drawinggrid", item.checked, 8); }, type: "checkbox", checked: false },
                            { label: "12x6", id: "drawinggrid_12x6", click(item) { win.send("toggle_drawinggrid", item.checked, 12); }, type: "checkbox", checked: false },
                            { label: "16x8", id: "drawinggrid_16x8", click(item) { win.send("toggle_drawinggrid", item.checked, 16); }, type: "checkbox", checked: false },
                        ]
                    },
                ]
            },
            { type: "separator" },
            { label: "Open Reference In Window\u2026", id: "open_reference_window", click(item) { event.emit("open_reference_window", win); } },
            { label: "Toggle Reference Image", id: "toggle_reference_image", accelerator: "Ctrl+Tab", click(item) { win.send("toggle_reference_image", item.checked); }, enabled: false, type: "checkbox", checked: true },
            { label: "Clear Reference Image", id: "clear_reference_image", click(item) { win.send("clear_reference_image"); }, enabled: false },
            { type: "separator" },
            { label: "Scroll Document With Cursor", id: "scroll_document_with_cursor", accelerator: "CmdorCtrl+R", click(item) { win.send("scroll_document_with_cursor", item.checked); }, type: "checkbox", checked: false },
            { type: "separator" },
            { role: "togglefullscreen", accelerator: "CmdorCtrl+Alt+F" },
        ]
    };
}

function font_menu_template(win) {
    return {
        label: "&Font",
        submenu: [
            { label: "Font Browser\u2026", id: "font_browser", accelerator: "CmdorCtrl+Shift+F", click(item) { win.send("open_font_browser"); } },
            { label: "Change Font (Default)", submenu: font_menu_items(win) },
            { label: "Change Font (Viler's VGA textmode fonts)", submenu: viler_font_menu_items(win) },
            { label: "Change Font (Custom & DiscMaster Amiga)", submenu: custom_font_menu_items(win) },
            { type: "separator" },
            { label: "Load Custom Font\u2026", id: "loadcustomfont", click(item) { win.send("load_custom_font"); } },
            { label: "Reset to default font\u2026", id: "resetxbinfont", click(item) { win.send("change_font", "IBM VGA"); } },
            { label: "Export font\u2026", id: "export_font", click(item) { win.send("export_font"); } },
            { label: "Import font from image (GIF/PNG)\u2026", id: "import_font", click(item) { win.send("import_font"); } },
            { type: "separator" },
            { label: "Show Character List", id: "show_charlist", accelerator: "CmdorCtrl+Alt+L", click(item) { win.send("show_charlist", item.checked); }, type: "checkbox", checked: true },
            { type: "separator" },
            { label: "Toggle Q-Key Inserts Selected Character", id: "q_key_insert", accelerator: "CmdorCtrl+Alt+F", type: "checkbox", click(item) { win.send("q_key_insert", item.checked); }, checked: false },
            { label: "Toggle Clicking on Character List Maps Function Keys", id: "charlist_fkey_mapping", type: "checkbox", click(item) { win.send("toggle_charlist_fkey_mapping", item.checked); }, checked: false },
            { type: "separator" },
            { label: "Use Character Under Cursor", id: "use_character_under_cursor", accelerator: "Alt+F", click(item) { win.send("use_character_under_cursor"); } },
            { type: "separator" },
            { label: "Use 9px Font", id: "use_9px_font", accelerator: "CmdorCtrl+F", click(item) { win.send("use_9px_font", item.checked); }, type: "checkbox", checked: false },
        ]
    };
}

function colors_menu_template(win) {
    return {
        label: "Colors",
        submenu: [
            { label: "Lospec Palette Browser\u2026", id: "palette_browser", accelerator: "CmdorCtrl+Shift+P", click(item) { win.send("open_palette_browser"); } },
            { label: "Load Lospec palette", submenu: lospec_palette_menu_items(win) },
            { type: "separator" },
            { label: "Save Palette as Hex\u2026", id: "save_palette_hex", click(item) { win.send("save_palette_hex"); } },
            { label: "Load Palette from Hex\u2026", id: "load_palette_hex", click(item) { win.send("load_palette_hex"); } },
            { type: "separator" },
            { label: "Select Attribute", id: "select_attribute", accelerator: "Alt+A", click(item) { win.send("select_attribute"); } },
            { type: "separator" },
            { label: "Previous Foreground Color", id: "previous_foreground_color", accelerator: "Ctrl+Up", click(item) { win.send("previous_foreground_color"); } },
            { label: "Next Foreground Color", id: "next_foreground_color", accelerator: "Ctrl+Down", click(item) { win.send("next_foreground_color"); } },
            { type: "separator" },
            { label: "Previous Background Color", id: "previous_background_colour", accelerator: "Ctrl+Left", click(item) { win.send("previous_background_color"); } },
            { label: "Next Background Color", id: "next_background_color", accelerator: "Ctrl+Right", click(item) { win.send("next_background_color"); } },
            { type: "separator" },
            { label: "Use Attribute Under Cursor", id: "use_attribute_under_cursor", accelerator: "Alt+U", click(item) { win.send("use_attribute_under_cursor"); } },
            { label: "Default Color", id: "default_color", accelerator: "CmdorCtrl+D", click(item) { win.send("default_color"); } },
            { label: "Switch Foreground / Background", id: "switch_foreground_background", accelerator: "Alt+X", click(item) { win.send("switch_foreground_background"); } },
            { type: "separator" },
            { label: "Use iCE Colors (stop blinking)", id: "ice_colors", accelerator: "CmdorCtrl+E", click(item) { win.send("ice_colors", item.checked); }, type: "checkbox", checked: true },
            { type: "separator" },
            { label: "Remove iCE Colors as New Document", id: "remove_ice_colors", click(item) { win.send("remove_ice_colors"); } },
        ]
    };
}

function network_menu_template(win, enabled) {
    return {
        label: "&Network", submenu: [
            { label: "Connect to Server…", id: "connect_to_server", accelerator: "CmdorCtrl+Alt+S", click(item) { event.emit("show_new_connection_window"); } },
            { type: "separator" },
            { label: "Toggle Chat Window", id: "chat_window_toggle", accelerator: "CmdorCtrl+[", click(item) { win.send("chat_window_toggle"); }, enabled },
        ]
    };
}

function debug_menu_template(win) {
    return {
        label: "Debug",
        submenu: [
            { label: "Open Dev Tools", id: "open_dev_tools", click(item) { win.openDevTools({ mode: "detach" }); } }
        ]
    };
}

function create_menu_template(win, chat, debug) {
    const menu_lists = [file_menu_template(win), edit_menu_template(win, chat), selection_menu_template(win, chat), colors_menu_template(win), font_menu_template(win), view_menu_template(win), network_menu_template(win, chat)];
    /*if (debug)*/ menu_lists.push(debug_menu_template(win));
    return menu_lists;
}

function get_menu_item(id, name) {
    return menus[id].getMenuItemById(name);
}

function get_chat_menu_item(id, name) {
    return chat_menus[id].getMenuItemById(name);
}

function enable(id, name) {
    get_menu_item(id, name).enabled = true;
    if (name != "cut" && name != "copy" && name != "paste" && name != "undo" && name != "redo" && name != "select_all") get_chat_menu_item(id, name).enabled = true;
}

function disable(id, name) {
    get_menu_item(id, name).enabled = false;
    if (name != "cut" && name != "copy" && name != "paste" && name != "undo" && name != "redo" && name != "select_all") get_chat_menu_item(id, name).enabled = false;
}

function check(id, name) {
    get_menu_item(id, name).checked = true;
    get_chat_menu_item(id, name).checked = true;
}

function uncheck(id, name) {
    get_menu_item(id, name).checked = false;
    get_chat_menu_item(id, name).checked = false;
}

function set_check(id, name, value) {
    get_menu_item(id, name).checked = value;
    get_chat_menu_item(id, name).checked = value;
}

electron.ipcMain.on("set_file", (event, { id }) => {
    enable(id, "show_file_in_folder");
    enable(id, "revert_to_last_save");
});

electron.ipcMain.on("enable_undo", (event, { id }) => {
    enable(id, "undo");
});

electron.ipcMain.on("disable_undo", (event, { id }) => {
    disable(id, "undo");
});

electron.ipcMain.on("enable_redo", (event, { id }) => {
    enable(id, "redo");
});

electron.ipcMain.on("disable_redo", (event, { id }) => {
    disable(id, "redo");
});

electron.ipcMain.on('show_reference_image', (event, { id }) => {
   check(id, 'toggle_reference_image');
});

electron.ipcMain.on('hide_reference_image', (event, { id }) => {
   uncheck(id, 'toggle_reference_image');
});

electron.ipcMain.on("enable_reference_image", (event, { id }) => {
    enable(id, "toggle_reference_image");
    check(id, "toggle_reference_image");
    enable(id, "clear_reference_image");
});

electron.ipcMain.on("disable_clear_reference_image", (event, { id }) => {
    disable(id, "toggle_reference_image");
    disable(id, "clear_reference_image");
});

electron.ipcMain.on("enable_selection_menu_items", (event, { id }) => {
    enable(id, "cut");
    enable(id, "copy");
    enable(id, "erase");
    enable(id, "fill");
    disable(id, "paste");
    disable(id, "paste_as_selection");
    enable(id, "deselect");
    enable(id, "move_block");
    enable(id, "copy_block");
    enable(id, "crop");
    enable(id, "export_selection");
    disable(id, "left_justify_line");
    disable(id, "right_justify_line");
    disable(id, "center_line");
    disable(id, "erase_line");
    disable(id, "erase_to_start_of_line");
    disable(id, "erase_to_end_of_line");
    disable(id, "erase_column");
    disable(id, "erase_to_start_of_column");
    disable(id, "erase_to_end_of_column");
    disable(id, "insert_row");
    disable(id, "delete_row");
    disable(id, "insert_column");
    disable(id, "delete_column");
    disable(id, "scroll_canvas_up");
    disable(id, "scroll_canvas_down");
    disable(id, "scroll_canvas_left");
    disable(id, "scroll_canvas_right");
    disable(id, "use_attribute_under_cursor");
    disable(id, "use_character_under_cursor");
    disable(id, "start_selection");
    disable(id, "select_attribute");
});

function disable_selection_menu_items(id) {
    disable(id, "cut");
    disable(id, "copy");
    disable(id, "erase");
    disable(id, "fill");
    disable(id, "deselect");
    disable(id, "move_block");
    disable(id, "copy_block");
    disable(id, "crop");
    disable(id, "export_selection");
    enable(id, "paste");
    enable(id, "paste_as_selection");
    enable(id, "left_justify_line");
    enable(id, "right_justify_line");
    enable(id, "center_line");
    enable(id, "erase_line");
    enable(id, "erase_to_start_of_line");
    enable(id, "erase_to_end_of_line");
    enable(id, "erase_column");
    enable(id, "erase_to_start_of_column");
    enable(id, "erase_to_end_of_column");
    enable(id, "insert_row");
    enable(id, "delete_row");
    enable(id, "insert_column");
    enable(id, "delete_column");
    enable(id, "scroll_canvas_up");
    enable(id, "scroll_canvas_down");
    enable(id, "scroll_canvas_left");
    enable(id, "scroll_canvas_right");
    enable(id, "use_attribute_under_cursor");
    enable(id, "use_character_under_cursor");
    enable(id, "start_selection");
}

electron.ipcMain.on("disable_selection_menu_items", (event, { id }) => disable_selection_menu_items(id));

electron.ipcMain.on("disable_selection_menu_items_except_deselect_and_crop", (event, { id }) => {
    disable_selection_menu_items(id);
    enable(id, "deselect");
    enable(id, "crop");
    enable(id, "export_selection");
});

electron.ipcMain.on("enable_operation_menu_items", (event, { id }) => {
    enable(id, "stamp");
    enable(id, "place");
    enable(id, "rotate");
    enable(id, "flip_x");
    enable(id, "flip_y");
    enable(id, "center");
    enable(id, "transparent");
    enable(id, "over");
    check(id, "over");
    enable(id, "underneath");
    disable(id, "left_justify_line");
    disable(id, "right_justify_line");
    disable(id, "center_line");
    disable(id, "erase_line");
    disable(id, "erase_to_start_of_line");
    disable(id, "erase_to_end_of_line");
    disable(id, "erase_column");
    disable(id, "erase_to_start_of_column");
    disable(id, "erase_to_end_of_column");
    disable(id, "insert_row");
    disable(id, "delete_row");
    disable(id, "insert_column");
    disable(id, "delete_column");
    disable(id, "scroll_canvas_up");
    disable(id, "scroll_canvas_down");
    disable(id, "scroll_canvas_left");
    disable(id, "scroll_canvas_right");
    disable(id, "paste");
    disable(id, "paste_as_selection");
    disable(id, "use_attribute_under_cursor");
    disable(id, "use_character_under_cursor");
    disable(id, "start_selection");
});

function disable_operation_menu_items(id) {
    disable(id, "stamp");
    disable(id, "place");
    disable(id, "rotate");
    disable(id, "flip_x");
    disable(id, "flip_y");
    disable(id, "center");
    disable(id, "transparent");
    uncheck(id, "transparent");
    disable(id, "over");
    uncheck(id, "over");
    disable(id, "underneath");
    uncheck(id, "underneath");
    enable(id, "paste");
    enable(id, "paste_as_selection");
    enable(id, "use_attribute_under_cursor");
    enable(id, "use_character_under_cursor");
}

electron.ipcMain.on("disable_operation_menu_items", (event, { id }) => disable_operation_menu_items(id));

electron.ipcMain.on("disable_editing_shortcuts", (event, { id }) => {
    disable_selection_menu_items(id);
    disable_operation_menu_items(id);
    disable(id, "use_attribute_under_cursor");
    disable(id, "use_character_under_cursor");
    disable(id, "left_justify_line");
    disable(id, "right_justify_line");
    disable(id, "center_line");
    disable(id, "erase_line");
    disable(id, "erase_to_start_of_line");
    disable(id, "erase_to_end_of_line");
    disable(id, "erase_column");
    disable(id, "erase_to_start_of_column");
    disable(id, "erase_to_end_of_column");
    disable(id, "insert_row");
    disable(id, "delete_row");
    disable(id, "insert_column");
    disable(id, "delete_column");
    disable(id, "scroll_canvas_up");
    disable(id, "scroll_canvas_down");
    disable(id, "scroll_canvas_left");
    disable(id, "scroll_canvas_right");
    disable(id, "paste");
    disable(id, "paste_as_selection");
    enable(id, "change_to_select_mode");
    enable(id, "change_to_brush_mode");
    enable(id, "change_to_shifter_mode");
    enable(id, "change_to_fill_mode");
    disable(id, "previous_character_set");
    disable(id, "next_character_set");
    disable(id, "default_character_set");
    disable(id, "start_selection");
});

electron.ipcMain.on("enable_editing_shortcuts", (event, { id }) => {
    disable_selection_menu_items(id);
    disable_operation_menu_items(id);
    enable(id, "use_attribute_under_cursor");
    enable(id, "use_character_under_cursor");
    enable(id, "left_justify_line");
    enable(id, "right_justify_line");
    enable(id, "center_line");
    enable(id, "erase_line");
    enable(id, "erase_to_start_of_line");
    enable(id, "erase_to_end_of_line");
    enable(id, "erase_column");
    enable(id, "erase_to_start_of_column");
    enable(id, "erase_to_end_of_column");
    enable(id, "insert_row");
    enable(id, "delete_row");
    enable(id, "insert_column");
    enable(id, "delete_column");
    enable(id, "scroll_canvas_up");
    enable(id, "scroll_canvas_down");
    enable(id, "scroll_canvas_left");
    enable(id, "scroll_canvas_right");
    enable(id, "paste");
    enable(id, "paste_as_selection");
    disable(id, "change_to_select_mode");
    disable(id, "change_to_brush_mode");
    disable(id, "change_to_shifter_mode");
    disable(id, "change_to_fill_mode");
    enable(id, "previous_character_set");
    enable(id, "next_character_set");
    enable(id, "default_character_set");
    enable(id, "start_selection");
    enable(id, "select_attribute");
});

electron.ipcMain.on("update_menu_checkboxes", (event, { id, insert_mode, overwrite_mode, q_key_insert, use_9px_font, ice_colors, actual_size, font_name, lospec_palette_name }) => {
    if (insert_mode != undefined) set_check(id, "toggle_insert_mode", insert_mode);
    if (overwrite_mode != undefined) set_check(id, "overwrite_mode", overwrite_mode);
    if (q_key_insert != undefined) set_check(id, "q_key_insert", q_key_insert);
    if (use_9px_font != undefined) set_check(id, "use_9px_font", use_9px_font);
    if (ice_colors != undefined) set_check(id, "ice_colors", ice_colors);
    if (actual_size != undefined) set_check(id, "actual_size", actual_size);
    if (lospec_palette_name != undefined) {
        if (lospec_palette_names[id]) uncheck(id, lospec_palette_names[id]);
        if (get_menu_item(id, lospec_palette_name)) {
            check(id, lospec_palette_name);
            lospec_palette_names[id] = lospec_palette_name;
        }
    }
    if (font_name != undefined) {
        if (font_names[id]) uncheck(id, font_names[id]);
        if (get_menu_item(id, font_name)) {
            check(id, font_name);
            font_names[id] = font_name;
        }
    }
});

electron.ipcMain.on("uncheck_transparent", (event, { id }) => uncheck(id, "transparent"));
electron.ipcMain.on("uncheck_underneath", (event, { id }) => uncheck(id, "underneath"));
electron.ipcMain.on("check_underneath", (event, { id }) => check(id, "underneath"));
electron.ipcMain.on("uncheck_over", (event, { id }) => uncheck(id, "over"));
electron.ipcMain.on("check_over", (event, { id }) => check(id, "over"));

electron.ipcMain.on("check_smallscale_guide", (event, { id }) => check(id, "smallscale_guide"));
electron.ipcMain.on("check_square_guide", (event, { id }) => check(id, "square_guide"));
electron.ipcMain.on("check_instagram_guide", (event, { id }) => check(id, "instagram_guide"));
electron.ipcMain.on("check_file_id_guide", (event, { id }) => check(id, "file_id_guide"));
electron.ipcMain.on("check_petscii_guide", (event, { id }) => check(id, "petscii_guide"));
electron.ipcMain.on("check_middle_guide", (event, { id }) => check(id, "middle_guide"));
electron.ipcMain.on("check_drawinggrid_1x1", (event, { id }) => check(id, "drawinggrid_1x1"));
electron.ipcMain.on("check_drawinggrid_4x2", (event, { id }) => check(id, "drawinggrid_4x2"));
electron.ipcMain.on("check_drawinggrid_6x3", (event, { id }) => check(id, "drawinggrid_6x3"));
electron.ipcMain.on("check_drawinggrid_8x4", (event, { id }) => check(id, "drawinggrid_8x4"));
electron.ipcMain.on("check_drawinggrid_12x6", (event, { id }) => check(id, "drawinggrid_12x6"));
electron.ipcMain.on("check_drawinggrid_16x8", (event, { id }) => check(id, "drawinggrid_16x8"));
electron.ipcMain.on("uncheck_all_guides", (event, { id }) => {
    uncheck(id, "smallscale_guide");
    uncheck(id, "square_guide");
    uncheck(id, "instagram_guide");
    uncheck(id, "file_id_guide");
    uncheck(id, "petscii_guide");
    uncheck(id, "drawinggrid_1x1");
    uncheck(id, "drawinggrid_4x2");
    uncheck(id, "drawinggrid_6x3");
    uncheck(id, "drawinggrid_8x4");
    uncheck(id, "drawinggrid_12x6");
    uncheck(id, "drawinggrid_16x8");
});

electron.ipcMain.on("enable_chat_window_toggle", (event, { id }) => {
    enable(id, "chat_window_toggle");
    check(id, "chat_window_toggle");
});

electron.ipcMain.on("enable_brush_size_shortcuts", (event, { id }) => {
    enable(id, "increase_brush_size");
    enable(id, "decrease_brush_size");
    enable(id, "reset_brush_size");
});

electron.ipcMain.on("disable_brush_size_shortcuts", (event, { id }) => {
    disable(id, "increase_brush_size");
    disable(id, "decrease_brush_size");
    disable(id, "reset_brush_size");
});

class MenuEvent extends events.EventEmitter {
    set_application_menu() {
        if (darwin) electron.Menu.setApplicationMenu(application);
    }

    chat_input_menu(win, debug) {
        const menu = darwin ? electron.Menu.buildFromTemplate([moebius_menu, ...create_menu_template(win, true, debug), window_menu_items, help_menu_items]) : electron.Menu.buildFromTemplate([...create_menu_template(win, true, debug), help_menu_items]);
        chat_menus[win.id] = menu;
        return menu;
    }

    get modal_menu() {
        return electron.Menu.buildFromTemplate([moebius_menu, bare_file, bare_edit, window_menu_items, help_menu_items]);
    }

    document_menu(win, debug) {
        const menu = darwin ? electron.Menu.buildFromTemplate([moebius_menu, ...create_menu_template(win, false, debug), window_menu_items, help_menu_items]) : electron.Menu.buildFromTemplate([...create_menu_template(win, false, debug), help_menu_items]);
        menus[win.id] = menu;
        return menu;
    }

    get dock_menu() {
        return electron.Menu.buildFromTemplate([
            { label: "New Document", click(item) { event.emit("new_document"); } },
            { label: "Open\u2026", click(item) { event.emit("open"); } },
            { label: "Preferences", click(item) { event.emit("preferences"); } },
            { label: "Connect to Server…", click(item) { event.emit("show_new_connection_window"); } }
        ]);
    }

    cleanup(id) {
        delete menus[id];
        delete font_names[id];
        delete lospec_palette_names[id];
    }
}

const event = new MenuEvent();

module.exports = event;
