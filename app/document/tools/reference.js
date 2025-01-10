const {tools, toolbar} = require("../ui/ui");

let enabled = false;

let reference_image = null;
let mouse_start_pos = null;
let reference_start_pos = null;

document.addEventListener("DOMContentLoaded", (event) => {
    reference_image = document.getElementById("reference_image");
});

tools.on("start", (mode) => {
    enabled = (mode === tools.modes.REFERENCE);
    if (enabled) {
        toolbar.show_reference();

        // The input/mouse.js event listener is designed to work at the resolution of characters
        // on the canvas, e.g. 25x80. But for this tool, we want to be able to smoothly resize
        // and move the reference image at pixel-level resolution. So this tool registers its
        // own event listeners as a somewhat hacky workaround.
        document.getElementById("viewport").addEventListener("pointerdown", pointer_down, true);
        document.body.addEventListener("pointermove", pointer_move, true);
        document.body.addEventListener("pointerup", pointer_up, true);
        document.body.addEventListener("pointerout", pointer_out, true);
    } else {
        document.getElementById("viewport").removeEventListener("pointerdown", pointer_down, true);
        document.body.removeEventListener("pointermove", pointer_move, true);
        document.body.removeEventListener("pointerup", pointer_up, true);
        document.body.removeEventListener("pointerout", pointer_out, true);
    }
});

function is_cursor_within_bounds(event) {
    const rect = reference_image.getBoundingClientRect();
    return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
    );
}

function move_reference(y, x) {
    reference_image.style.top = `${y}px`;
    reference_image.style.left = `${x}px`;
}

function pointer_down(event) {
    if (event.button !== 0) return;

    if (is_cursor_within_bounds(event)) {
        mouse_start_pos = { y: event.clientY, x: event.clientX }
        reference_start_pos = {
            y: parseFloat(getComputedStyle(reference_image).top) || 0,
            left: parseFloat(getComputedStyle(reference_image).left) || 0
        }
    }
}

function pointer_up(event) {
    if (event.button !== 0) return;

    mouse_start_pos = null;
    reference_start_pos = null;
}

function pointer_out(event) {
    if (event.relatedTarget) return;

    mouse_start_pos = null;
    reference_start_pos = null;
}

function pointer_move(event) {
    if (event.button !== 0) return;

    if (mouse_start_pos) {
        const y_offset = event.clientY - mouse_start_pos.y;
        const x_offset = event.clientX - mouse_start_pos.x;

        move_reference(reference_start_pos.y + y_offset, reference_start_pos.left + x_offset);
    }
}
