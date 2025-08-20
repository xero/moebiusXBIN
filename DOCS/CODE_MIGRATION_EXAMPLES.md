# Code Migration Examples
## Specific Electron to Web API Replacements

This document provides concrete examples of how to migrate specific Electron APIs to web-compatible alternatives.

## 1. File System Operations

### Before (Electron - app/prefs.js)
```javascript
const electron = require("electron");
const path = require("path");
const fs = require("fs");

const file = path.join(electron.app.getPath("userData"), "preferences.json");

function set(key, value) {
    prefs[key] = value;
    fs.writeFileSync(file, JSON5.stringify(prefs, undefined, "  "));
}

function get(key) {
    try {
        const data = fs.readFileSync(file, "utf8");
        return JSON5.parse(data)[key];
    } catch (error) {
        return default_values[key];
    }
}
```

### After (Web Compatible)
```javascript
class WebPreferences {
    constructor() {
        this.storageKey = 'moebiusxbin_preferences';
    }

    async set(key, value) {
        try {
            const prefs = await this.getAll();
            prefs[key] = value;
            localStorage.setItem(this.storageKey, JSON.stringify(prefs));
            
            // Also store in IndexedDB for larger data
            if (this.isLargeValue(value)) {
                await this.setInIndexedDB(key, value);
            }
        } catch (error) {
            console.error('Failed to save preference:', error);
        }
    }

    async get(key) {
        try {
            const prefs = this.getAll();
            return prefs[key] !== undefined ? prefs[key] : default_values[key];
        } catch (error) {
            return default_values[key];
        }
    }

    getAll() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            return {};
        }
    }

    async setInIndexedDB(key, value) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoebiusXBIN', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['preferences'], 'readwrite');
                const store = transaction.objectStore('preferences');
                store.put({ key, value });
                transaction.oncomplete = () => resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }
}
```

## 2. File Dialog Operations

### Before (Electron - app/controller.js)
```javascript
const electron = require("electron");

async function save_as() {
    const file = electron.dialog.showSaveDialogSync(win, {
        defaultPath: `${doc.title || "Untitled"}.ans`,
        filters: [
            { name: "ANSI Art", extensions: ["ans"] },
            { name: "XBin", extensions: ["xb"] },
            { name: "Binary Text", extensions: ["bin"] }
        ]
    });
    
    if (file) {
        fs.writeFileSync(file, doc.data);
    }
}

function open_file() {
    const files = electron.dialog.showOpenDialogSync(win, {
        filters: [
            { name: "ANSI Art", extensions: ["ans", "xb", "bin"] }
        ],
        properties: ["openFile"]
    });
    
    if (files && files[0]) {
        const data = fs.readFileSync(files[0]);
        doc.load(data);
    }
}
```

### After (Web Compatible)
```javascript
class WebFileHandler {
    constructor() {
        this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
    }

    async saveAs(data, suggestedName = 'untitled.ans', fileTypes = []) {
        if (this.supportsFileSystemAccess) {
            return await this.saveWithFileSystemAPI(data, suggestedName, fileTypes);
        } else {
            return this.saveWithDownload(data, suggestedName);
        }
    }

    async saveWithFileSystemAPI(data, suggestedName, fileTypes) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName,
                types: [{
                    description: 'ANSI Art Files',
                    accept: {
                        'text/plain': ['.ans', '.xb', '.bin', '.diz', '.nfo', '.asc']
                    }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            
            return fileHandle.name;
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
            return null;
        }
    }

    saveWithDownload(data, filename) {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        return filename;
    }

    async openFile() {
        if (this.supportsFileSystemAccess) {
            return await this.openWithFileSystemAPI();
        } else {
            return await this.openWithInput();
        }
    }

    async openWithFileSystemAPI() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'ANSI Art Files',
                    accept: {
                        'text/plain': ['.ans', '.xb', '.bin', '.diz', '.nfo', '.asc']
                    }
                }]
            });

            const file = await fileHandle.getFile();
            const data = await file.arrayBuffer();
            
            return {
                name: file.name,
                data: new Uint8Array(data),
                handle: fileHandle
            };
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
            return null;
        }
    }

    async openWithInput() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ans,.xb,.bin,.diz,.nfo,.asc';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    const data = await file.arrayBuffer();
                    resolve({
                        name: file.name,
                        data: new Uint8Array(data)
                    });
                } else {
                    resolve(null);
                }
            };
            
            input.onclick = () => {
                input.value = null; // Allow selecting the same file again
            };
            
            input.click();
        });
    }
}
```

## 3. IPC Communication Replacement

### Before (Electron - app/senders.js)
```javascript
const electron = require("electron");

function send(channel, opts) {
    electron.ipcRenderer.send(channel, {
        id: electron.remote.getCurrentWindow().id, 
        ...opts
    });
}

function send_sync(channel, opts) {
    return electron.ipcRenderer.sendSync(channel, {
        id: electron.remote.getCurrentWindow().id, 
        ...opts
    });
}

function on(channel, callback) {
    return electron.ipcRenderer.on(channel, callback);
}
```

### After (Web Compatible)
```javascript
import EventEmitter from 'events';

class WebEventBus extends EventEmitter {
    constructor() {
        super();
        this.documentId = this.generateDocumentId();
        this.handlers = new Map();
    }

    send(channel, opts = {}) {
        const payload = {
            id: this.documentId,
            timestamp: Date.now(),
            ...opts
        };
        
        // Emit synchronously for immediate handlers
        this.emit(channel, payload);
        
        // Also dispatch as custom event for cross-component communication
        window.dispatchEvent(new CustomEvent(`moebius:${channel}`, {
            detail: payload
        }));
    }

    sendSync(channel, opts = {}) {
        // Simulate synchronous behavior with immediate response
        const payload = {
            id: this.documentId,
            timestamp: Date.now(),
            ...opts
        };
        
        const event = { returnValue: null };
        this.emit(channel, event, payload);
        return event.returnValue;
    }

    on(channel, callback) {
        // Support both EventEmitter and window event patterns
        const wrappedCallback = (event, data) => {
            callback(event, data);
        };
        
        this.addListener(channel, wrappedCallback);
        
        // Also listen to window events
        const windowHandler = (event) => {
            callback(event, event.detail);
        };
        window.addEventListener(`moebius:${channel}`, windowHandler);
        
        this.handlers.set(callback, windowHandler);
        
        return {
            remove: () => {
                this.removeListener(channel, wrappedCallback);
                window.removeEventListener(`moebius:${channel}`, windowHandler);
                this.handlers.delete(callback);
            }
        };
    }

    generateDocumentId() {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Global instance
const eventBus = new WebEventBus();

// Export familiar API
export function send(channel, opts) {
    return eventBus.send(channel, opts);
}

export function sendSync(channel, opts) {
    return eventBus.sendSync(channel, opts);
}

export function on(channel, callback) {
    return eventBus.on(channel, callback);
}
```

## 4. Window Management

### Before (Electron - app/window.js)
```javascript
const electron = require("electron");

async function new_modal(file, window_opts) {
    const win = new electron.BrowserWindow({
        ...window_opts,
        modal: true,
        parent: parentWin,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    });
    
    win.loadFile(file);
    win.show();
    return win;
}

async function new_doc() {
    return await new_win("app/html/document.html", {
        width: 1280, 
        height: 800,
        minWidth: 800,
        minHeight: 500
    });
}
```

### After (Web Compatible)
```javascript
class WebWindowManager {
    constructor() {
        this.modals = new Map();
        this.documents = new Map();
        this.zIndexCounter = 1000;
    }

    async createModal(contentUrl, options = {}) {
        const modalId = this.generateId();
        const modal = await this.createModalElement(contentUrl, options);
        
        this.modals.set(modalId, modal);
        return {
            id: modalId,
            element: modal,
            close: () => this.closeModal(modalId),
            show: () => modal.style.display = 'flex',
            hide: () => modal.style.display = 'none'
        };
    }

    async createModalElement(contentUrl, options) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: ${++this.zIndexCounter};
        `;

        const modalWindow = document.createElement('div');
        modalWindow.className = 'modal-window';
        modalWindow.style.cssText = `
            background: #292c33;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            width: ${options.width || 800}px;
            height: ${options.height || 600}px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        // Load content
        try {
            const response = await fetch(contentUrl);
            const html = await response.text();
            modalWindow.innerHTML = html;
        } catch (error) {
            modalWindow.innerHTML = `<div>Error loading content: ${error.message}</div>`;
        }

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modalId);
            }
        });

        // ESC key to close
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modalId);
            }
        };
        document.addEventListener('keydown', keyHandler);
        modal._keyHandler = keyHandler;

        modal.appendChild(modalWindow);
        document.body.appendChild(modal);

        return modal;
    }

    createDocument(options = {}) {
        const docId = this.generateId();
        const container = document.createElement('div');
        container.className = 'document-container';
        container.id = `doc-${docId}`;
        
        container.style.cssText = `
            position: absolute;
            background: #292c33;
            border: 1px solid #444;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            width: ${options.width || 1280}px;
            height: ${options.height || 800}px;
            min-width: ${options.minWidth || 800}px;
            min-height: ${options.minHeight || 500}px;
            resize: both;
            overflow: auto;
            z-index: ${++this.zIndexCounter};
        `;

        // Make draggable
        this.makeDraggable(container);
        
        this.documents.set(docId, container);
        document.body.appendChild(container);

        return {
            id: docId,
            element: container,
            close: () => this.closeDocument(docId),
            focus: () => this.focusDocument(docId)
        };
    }

    makeDraggable(element) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;

        const header = document.createElement('div');
        header.style.cssText = `
            height: 30px;
            background: #333;
            cursor: move;
            display: flex;
            align-items: center;
            padding: 0 10px;
            user-select: none;
        `;
        header.textContent = 'Document';

        element.insertBefore(header, element.firstChild);

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    closeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            if (modal._keyHandler) {
                document.removeEventListener('keydown', modal._keyHandler);
            }
            document.body.removeChild(modal);
            this.modals.delete(modalId);
        }
    }

    closeDocument(docId) {
        const doc = this.documents.get(docId);
        if (doc) {
            document.body.removeChild(doc);
            this.documents.delete(docId);
        }
    }

    focusDocument(docId) {
        const doc = this.documents.get(docId);
        if (doc) {
            doc.style.zIndex = ++this.zIndexCounter;
        }
    }

    generateId() {
        return `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Global instance
const windowManager = new WebWindowManager();

export async function newModal(file, options) {
    return await windowManager.createModal(file, options);
}

export function newDoc(options) {
    return windowManager.createDocument(options);
}
```

## 5. Font Management

### Before (Electron - app/font_registry.js)
```javascript
const fs = require("fs");
const path = require("path");

class FontRegistry {
    loadFonts() {
        const fontDir = path.join(__dirname, "fonts");
        const files = fs.readdirSync(fontDir);
        
        files.forEach(file => {
            if (file.endsWith('.f')) {
                const fontData = fs.readFileSync(path.join(fontDir, file));
                this.registerFont(file, fontData);
            }
        });
    }
}
```

### After (Web Compatible)
```javascript
class WebFontRegistry {
    constructor() {
        this.fonts = new Map();
        this.loadedFonts = new Set();
    }

    async loadFonts() {
        try {
            // Load font list from manifest
            const response = await fetch('/fonts/manifest.json');
            const manifest = await response.json();
            
            for (const fontInfo of manifest.fonts) {
                await this.loadFont(fontInfo);
            }
        } catch (error) {
            console.error('Failed to load font manifest:', error);
            // Fallback to default fonts
            await this.loadDefaultFonts();
        }
    }

    async loadFont(fontInfo) {
        try {
            const response = await fetch(`/fonts/${fontInfo.file}`);
            const fontData = await response.arrayBuffer();
            
            // Create FontFace for web fonts
            if (fontInfo.format === 'truetype' || fontInfo.format === 'woff') {
                const fontFace = new FontFace(fontInfo.name, fontData);
                await fontFace.load();
                document.fonts.add(fontFace);
            }
            
            this.fonts.set(fontInfo.name, {
                data: new Uint8Array(fontData),
                info: fontInfo
            });
            
            this.loadedFonts.add(fontInfo.name);
        } catch (error) {
            console.error(`Failed to load font ${fontInfo.name}:`, error);
        }
    }

    async loadDefaultFonts() {
        // Load basic bitmap fonts that are bundled
        const defaultFonts = [
            'IBM VGA 8x16',
            'IBM VGA 8x14',
            'IBM VGA 8x8'
        ];
        
        for (const fontName of defaultFonts) {
            try {
                const response = await fetch(`/fonts/${fontName.replace(/\s/g, '_')}.f`);
                const fontData = await response.arrayBuffer();
                
                this.fonts.set(fontName, {
                    data: new Uint8Array(fontData),
                    info: { name: fontName, format: 'bitmap' }
                });
                
                this.loadedFonts.add(fontName);
            } catch (error) {
                console.warn(`Could not load default font ${fontName}`);
            }
        }
    }

    getFont(name) {
        return this.fonts.get(name);
    }

    getAllFonts() {
        return Array.from(this.fonts.entries()).map(([name, data]) => ({
            name,
            ...data.info
        }));
    }

    async addCustomFont(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const fontData = new Uint8Array(arrayBuffer);
            
            // Parse font to get metadata
            const fontInfo = this.parseFontMetadata(fontData, file.name);
            
            this.fonts.set(fontInfo.name, {
                data: fontData,
                info: fontInfo
            });
            
            this.loadedFonts.add(fontInfo.name);
            
            // Store in IndexedDB for persistence
            await this.storeFontInDB(fontInfo.name, fontData, fontInfo);
            
            return fontInfo;
        } catch (error) {
            throw new Error(`Failed to add custom font: ${error.message}`);
        }
    }

    parseFontMetadata(fontData, filename) {
        // Basic font parsing logic
        const name = filename.replace(/\.[^/.]+$/, "");
        
        // For bitmap fonts, try to detect dimensions
        let width = 8, height = 16;
        if (fontData.length === 4096) {
            height = 16;
        } else if (fontData.length === 2048) {
            height = 8;
        } else if (fontData.length === 3584) {
            height = 14;
        }
        
        return {
            name,
            width,
            height,
            format: 'bitmap',
            size: fontData.length
        };
    }

    async storeFontInDB(name, data, info) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoebiusFonts', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fonts')) {
                    db.createObjectStore('fonts', { keyPath: 'name' });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['fonts'], 'readwrite');
                const store = transaction.objectStore('fonts');
                
                store.put({
                    name,
                    data: Array.from(data), // IndexedDB doesn't handle Uint8Array well
                    info,
                    timestamp: Date.now()
                });
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
}

// Global instance
const fontRegistry = new WebFontRegistry();

export { fontRegistry };
```

These examples show the level of complexity involved in migrating from Electron to web APIs. Each migration requires careful consideration of browser compatibility, fallback mechanisms, and user experience differences.