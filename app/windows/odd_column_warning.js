const electron = require("electron");

function cancel() {
    electron.remote.getCurrentWindow().close();
}

document.addEventListener("keydown", (event) => {
    if (event.code == "Enter") {
        cancel();
    } else if (event.code == "Escape") {
        cancel();
    }
}, true);

document.addEventListener("DOMContentLoaded", (event) => {
    document.getElementById("cancel").addEventListener("click", event => cancel(), true);
}, true);

electron.ipcRenderer.on("cancel", (event) => cancel());