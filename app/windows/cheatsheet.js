const libtextmode = require("../libtextmode/libtextmode");
const dev = require("electron-is-dev");
const ans_path = dev ? "./build/ans/" : `${process.resourcesPath}/ans/`;
<<<<<<< HEAD
const electron = require("electron");

document.addEventListener("keydown", (event) => {
    if (event.key == "Escape") electron.remote.getCurrentWindow().close();
}, true);
=======
>>>>>>> moebius-customfont/master

document.addEventListener("DOMContentLoaded", () => {
    libtextmode.animate({file: `${ans_path}cheatsheet.ans`, ctx: document.getElementById("cheatsheet_terminal").getContext("2d")});
});
