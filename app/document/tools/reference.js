const {tools, toolbar} = require("../ui/ui");
let enabled = false;

tools.on("start", (mode) => {
    enabled = (mode === tools.modes.REFERENCE);
    if (enabled) {
        toolbar.show_reference();
    }
});
