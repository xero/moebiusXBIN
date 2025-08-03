const events = require("events");
const {on} = require("../../senders");
const darwin = (process.platform == "darwin");
const doc = require("../doc");
const libtextmode = require("../../libtextmode/libtextmode");
let use_shift = true;

class KeyboardEvent extends events.EventEmitter {
    chat(text) {
        if (doc.connection && text) doc.connection.chat(text);
    }

    ctrl_key(event) {
        if (this.use_number_keys_for_colors) {
            switch (event.code) {
                case "Digit0":
                    this.emit("toggle_fg", 0);
                    return;
                case "Digit1":
                    this.emit("toggle_fg", 1);
                    return;
                case "Digit2":
                    this.emit("toggle_fg", 2);
                    return;
                case "Digit3":
                    this.emit("toggle_fg", 3);
                    return;
                case "Digit4":
                    this.emit("toggle_fg", 4);
                    return;
                case "Digit5":
                    this.emit("toggle_fg", 5);
                    return;
                case "Digit6":
                    this.emit("toggle_fg", 6);
                    return;
                case "Digit7":
                    this.emit("toggle_fg", 7);
                    return;
            }
        }
        switch (event.key) {
            case "c": case "C":
                this.emit("copy");
                return;
            case "v": case "V":
                this.emit("paste");
                return;
            case "x": case "X":
                this.emit("cut");
                return;
            case "z": case "Z":
                if (!darwin) {
                    doc.undo();
                    event.preventDefault();
                }
                return;
            case "y": case "Y":
                if (!darwin) {
                    doc.redo();
                    event.preventDefault();
                }
                return;
            case "a": case "A":
                if (!darwin) {
                    this.emit("select_all");
                    event.preventDefault();
                }
                return;
            case "h": case "H":
                this.emit("move_charlist", "left");
                event.preventDefault();
                return;
            case "k": case "K":
                this.emit("move_charlist", "up");
                event.preventDefault();
                return;
            case "l": case "L":
                this.emit("move_charlist", "right");
                event.preventDefault();
                return;
            case "j": case "J":
                this.emit("move_charlist", "down");
                event.preventDefault();
                return;
            case "q": case "Q":
                this.emit("insert_charlist_selection");
                event.preventDefault();
                return;
        }
        
        // If color shortcuts are disabled, or if this is not a color shortcut, use key_typed
        this.key_typed(event);
    }

    alt_key(event) {
        switch (event.code) {
            case "Numpad0":
            case "Numpad1":
            case "Numpad2":
            case "Numpad3":
            case "Numpad4":
            case "Numpad5":
            case "Numpad6":
            case "Numpad7":
            case "Numpad8":
            case "Numpad9":
                this.alt_numpad_active = true;
                const digit = event.code.slice(-1);
                this.alt_numpad_buffer += digit;
                event.preventDefault();
                return;
            case "F1":
                this.emit("change_fkeys", event.shiftKey ? 10 : 0);
                return;
            case "F2":
                this.emit("change_fkeys", event.shiftKey ? 11 : 1);
                return;
            case "F3":
                this.emit("change_fkeys", event.shiftKey ? 12 : 2);
                return;
            case "F4":
                this.emit("change_fkeys", event.shiftKey ? 13 : 3);
                return;
            case "F5":
                this.emit("change_fkeys", event.shiftKey ? 14 : 4);
                return;
            case "F6":
                this.emit("change_fkeys", event.shiftKey ? 15 : 5);
                return;
            case "F7":
                this.emit("change_fkeys", event.shiftKey ? 16 : 6);
                return;
            case "F8":
                this.emit("change_fkeys", event.shiftKey ? 17 : 7);
                return;
            case "F9":
                this.emit("change_fkeys", event.shiftKey ? 18 : 8);
                return;
            case "F10":
                this.emit("change_fkeys", event.shiftKey ? 19 : 9);
                return;
            case "ArrowUp":
                this.emit("insert_row");
                event.preventDefault();
                return;
            case "ArrowDown":
                this.emit("delete_row");
                event.preventDefault();
                return;
            case "ArrowRight":
                this.emit("insert_column");
                event.preventDefault();
                return;
            case "ArrowLeft":
                this.emit("delete_column");
                event.preventDefault();
                return;
        }
        
        if (this.use_number_keys_for_colors) {
            switch (event.code) {
                case "Digit0":
                    this.emit("toggle_bg", 0);
                    return;
                case "Digit1":
                    this.emit("toggle_bg", 1);
                    return;
                case "Digit2":
                    this.emit("toggle_bg", 2);
                    return;
                case "Digit3":
                    this.emit("toggle_bg", 3);
                    return;
                case "Digit4":
                    this.emit("toggle_bg", 4);
                    return;
                case "Digit5":
                    this.emit("toggle_bg", 5);
                    return;
                case "Digit6":
                    this.emit("toggle_bg", 6);
                    return;
                case "Digit7":
                    this.emit("toggle_bg", 7);
                    return;
            }
        }
        
        // Check if this is a menu shortcut - if so, don't process as alternative character
        if (this.isMenuShortcut(event)) {
            return;
        }
        
        // If color shortcuts are disabled, or if this is not a color shortcut, use key_typed
        this.key_typed(event);
    }

    isMenuShortcut(event) {
        // Check for Alt-only shortcuts (no other modifiers)
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            switch (event.code) {
                case "KeyA":  // Alt+A - Select Attribute
                case "KeyB":  // Alt+B - Start Selection
                case "KeyC":  // Alt+C - Center Line
                case "KeyE":  // Alt+E - Erase Row
                case "KeyF":  // Alt+F - Select Character Under Cursor
                case "KeyL":  // Alt+L - Left Justify Line
                case "KeyR":  // Alt+R - Right Justify Line
                case "KeyU":  // Alt+U - Use Attribute Under Cursor
                case "KeyX":  // Alt+X - Switch Foreground/Background
                case "Home":  // Alt+Home - Erase to Start of Row
                case "End":   // Alt+End - Erase to End of Row
                case "PageUp":    // Alt+PageUp - Erase to Start of Column
                case "PageDown":  // Alt+PageDown - Erase to End of Column
                case "Equal":     // Alt+= - Increase Brush Size
                case "Minus":     // Alt+- - Decrease Brush Size
                    return true;
                case "Digit0":    // Alt+0 - Reset Brush Size (when not used for colors)
                    return !this.use_number_keys_for_colors;
            }
        }
        
        // Check for Alt+Shift shortcuts
        if (!event.ctrlKey && !event.metaKey && event.shiftKey) {
            switch (event.code) {
                case "KeyE":  // Alt+Shift+E - Erase Column
                    return true;
            }
        }
        
        return false;
    }

    meta_key(event) {
        if (darwin) {
            switch (event.code) {
                case "ArrowLeft":
                    if (event.shiftKey && use_shift) this.emit("start_selection");
                    this.emit("start_of_row");
                    event.preventDefault();
                    return;
                case "ArrowUp":
                    if (event.shiftKey && use_shift) this.emit("start_selection");
                    this.emit("page_up");
                    event.preventDefault();
                    return;
                case "ArrowRight":
                    if (event.shiftKey && use_shift) this.emit("start_selection");
                    this.emit("end_of_row");
                    event.preventDefault();
                    return;
                case "ArrowDown":
                    if (event.shiftKey && use_shift) this.emit("start_selection");
                    this.emit("page_down");
                    event.preventDefault();
                    return;
            }
        }
    }

    key_typed(event) {
        if (this.use_numpad) {
            switch (event.code) {
                case "Numpad1":
                    this.emit("f_key", 1);
                    return;
                case "Numpad2":
                    this.emit("f_key", 5);
                    return;
                case "Numpad3":
                    this.emit("f_key", 1);
                    return;
                case "Numpad4":
                    this.emit("f_key", 6);
                    return;
                case "Numpad5":
                    this.emit("f_key", 3);
                    return;
                case "Numpad6":
                    this.emit("f_key", 7);
                    return;
                case "Numpad7":
                    this.emit("f_key", 2);
                    return;
                case "Numpad8":
                    this.emit("f_key", 4);
                    return;
                case "Numpad9":
                    this.emit("f_key", 2);
                    return;
                case "Numpad0":
                    this.emit("f_key", 0);
                    return;
                case "NumpadAdd":
                    this.emit("f_key", 0);
                    return;
                case "NumpadDecimal":
                    this.emit("key_typed", 32);
                    return;
                case "NumpadEnter":
                    this.emit("new_line");
                    return;
            }
        }
        if (this.use_number_row) {
            switch (event.code) {
                case "Digit1":
                    this.emit("f_key", 0);
                    return;
                case "Digit2":
                    this.emit("f_key", 1);
                    return;
                case "Digit3":
                    this.emit("f_key", 2);
                    return;
                case "Digit4":
                    this.emit("f_key", 3);
                    return;
                case "Digit5":
                    this.emit("f_key", 4);
                    return;
                case "Digit6":
                    this.emit("f_key", 5);
                    return;
                case "Digit7":
                    this.emit("f_key", 6);
                    return;
                case "Digit8":
                    this.emit("f_key", 7);
                    return;
                case "Digit9":
                    this.emit("f_key", 8);
                    return;
                case "Digit0":
                    this.emit("f_key", 9);
                    return;
                case "Minus":
                    this.emit("f_key", 10);
                    return;
                case "Equal":
                    this.emit("f_key", 11);
                    return;
            }
        }
        switch (event.code) {
            case "Home":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("start_of_row");
                event.preventDefault();
                return;
            case "End":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("end_of_row");
                event.preventDefault();
                return;
            case "ArrowLeft":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("left");
                event.preventDefault();
                return;
            case "ArrowUp":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("up");
                event.preventDefault();
                return;
            case "ArrowRight":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("right");
                event.preventDefault();
                return;
            case "ArrowDown":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("down");
                event.preventDefault();
                return;
            case "PageUp":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("page_up");
                event.preventDefault();
                return;
            case "PageDown":
                if (event.shiftKey && use_shift) this.emit("start_selection");
                this.emit("page_down");
                event.preventDefault();
                return;
            case "Tab":
                this.emit(event.shiftKey ? "reverse_tab" : "tab");
                event.preventDefault();
                return;
            case "Enter":
                this.emit("new_line");
                return;
            case "Insert":
                if (darwin) {
                    this.insert_mode = !this.insert_mode;
                    this.emit("insert", this.insert_mode);
                }
                return;
            case "F1":
                this.emit("f_key", 0);
                return;
            case "F2":
                this.emit("f_key", 1);
                return;
            case "F3":
                this.emit("f_key", 2);
                return;
            case "F4":
                this.emit("f_key", 3);
                return;
            case "F5":
                this.emit("f_key", 4);
                return;
            case "F6":
                this.emit("f_key", 5);
                return;
            case "F7":
                this.emit("f_key", 6);
                return;
            case "F8":
                this.emit("f_key", 7);
                return;
            case "F9":
                this.emit("f_key", 8);
                return;
            case "F10":
                this.emit("f_key", 9);
                return;
            case "F11":
                this.emit("f_key", 10);
                return;
            case "F12":
                this.emit("f_key", 11);
                return;
            case "Backspace":
                this.emit("backspace");
                return;
            case "Delete":
                this.emit("delete_key");
                return;
            case "Escape":
                this.emit("escape");
                return;
            case "KeyQ":
                if (this.q_key_insert) {
                    this.emit("insert_charlist_selection");
                    event.preventDefault();
                    return;
                }
                break;
        }
        if (event.key.length == 1) {
            const code = libtextmode.encoding_manager.unicode_to_encoding(event.key.charCodeAt(0));
            if (code == 32) event.preventDefault();
            if (code) this.emit("key_typed", code);
        }
    }

    keydown(event) {
        if (document.activeElement == this.chat_input) {
            if (event.code == "Enter" || event.code == "NumpadEnter" && this.chat_input.value){
                this.chat(this.chat_input.value);
                this.chat_input.value = "";
            }
        } else if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
            this.key_typed(event);
        } else if (event.ctrlKey && !event.altKey && !event.metaKey) {
            this.ctrl_key(event);
        } else if (event.altKey && !event.ctrlKey && !event.metaKey) {
            this.alt_key(event);
        } else if (event.metaKey && !event.ctrlKey && !event.altKey) {
            this.meta_key(event);
        } else if (!event.ctrlKey && !event.altKey && !event.metaKey) {
            this.key_typed(event);
        }
    }

    keyup(event) {
        if (event.code === "AltLeft" || event.code === "AltRight") {
            if (this.alt_numpad_active && this.alt_numpad_buffer.length > 0) {
                const asciiCode = parseInt(this.alt_numpad_buffer, 10);
                if (asciiCode > 0 && asciiCode <= 255) {
                    this.emit("key_typed", asciiCode);
                }
                this.alt_numpad_active = false;
                this.alt_numpad_buffer = "";
            }
        }
    }

    get in_chat() {
        return document.activeElement == this.chat_input;
    }

    constructor() {
        super();
        this.use_numpad = false;
        this.use_number_row = false;
        this.insert_mode = false;
        this.overwrite_mode = false;
        this.q_key_insert = false;
        this.use_number_keys_for_colors = true;
        this.alt_numpad_active = false;
        this.alt_numpad_buffer = "";
        on("use_numpad", (event, value) => this.use_numpad = value);
        on("use_number_row", (event, value) => this.use_number_row = value);
        on("insert_mode", (event, value) => this.insert_mode = value);
        on("overwrite_mode", (event, value) => this.overwrite_mode = value);
        on("q_key_insert", (event, value) => this.q_key_insert = value);
        on("use_number_keys_for_colors", (event, value) => this.use_number_keys_for_colors = value);
        on("f_key", (event, value) => this.emit("f_key", value));
        on("change_encoding", (event, encoding) => {
            libtextmode.encoding_manager.set_encoding(encoding);
        });
        document.addEventListener("DOMContentLoaded", () => {
            this.chat_input = document.getElementById("chat_input");
            document.body.addEventListener("keydown", (event) => this.keydown(event), true);
            document.body.addEventListener("keyup", (event) => this.keyup(event), true);
        }, true);
    }
}

on("use_shift", (event, value) => use_shift = value);
on("encoding", (event, value) => {
    libtextmode.encoding_manager.set_encoding(value);
});

module.exports = new KeyboardEvent();
