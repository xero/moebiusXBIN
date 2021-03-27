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

document.addEventListener("DOMContentLoaded", async () => {
    const doc = await libtextmode.read_file(`${ans_path}changelog.ans`);
    const render = await libtextmode.render(doc);
    document.getElementById("canvas_container").appendChild(render.canvas);
});
