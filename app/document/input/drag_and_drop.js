const path = require('path');
const { send } = require("../../senders");
const doc = require("../doc");
const {open_reference_image} = require("../ui/ui");

const document_extensions = [".ans", ".asc", ".diz", ".nfo", ".txt", ".xb", ".bin"]
const reference_extensions = [".png", ".jpg", ".jpeg"]
const font_extensions = [
    ".f06", ".f07", ".f08", ".f09", ".f10", ".f11", ".f12", ".f13", ".f14", ".f15",
    ".f16", ".f17", ".f18", ".f19", ".f20", ".f21", ".f22", ".f23", ".f24", ".f25",
    ".f26", ".f27", ".f28", ".f29", ".f30", ".f31", ".f32"
]

document.addEventListener("DOMContentLoaded", (event) => {
    document.body.addEventListener("dragover", event => {
        event.preventDefault();
    });

    document.body.addEventListener("drop", event => {
        event.preventDefault();

        const files = event.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        const ext = path.extname(file.name).toLowerCase();

        if (document_extensions.includes(ext)) {
            send("open", file.path)
        } else if (reference_extensions.includes(ext)) {
            open_reference_image({file: file.path})
        } else if (font_extensions.includes(ext)) {
            doc.load_custom_font({file: file.path});
        }
    });
});