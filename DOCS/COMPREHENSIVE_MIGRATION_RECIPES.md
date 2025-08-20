# Comprehensive Migration Recipes: Electron to Web/PWA
## MoebiusXBIN - Detailed Implementation Guide

This document provides comprehensive migration recipes for converting high and medium complexity Electron patterns to web-compatible implementations. Each recipe includes detailed code examples, browser compatibility notes, and implementation guidance.

---

## 🔴 HIGH COMPLEXITY MIGRATIONS

### 1. Inter-Process Communication (IPC) System Replacement

**Complexity:** HIGH | **Priority:** CRITICAL | **Effort:** 3-4 weeks

#### Current Electron Pattern

```javascript
// Main Process (app/moebius.js)
const electron = require("electron");

// IPC Handler Registration
electron.ipcMain.on("open_font_browser", async (event, { id }) => {
    docs[id].modal = await window.new_modal("app/html/font_browser.html", {
        width: 800,
        height: 600,
        parent: docs[id].win,
        frame: false,
        ...get_centered_xy(id, 800, 600)
    });
    event.returnValue = true;
});

electron.ipcMain.on("font-browser-selection", (event, selectedFont) => {
    const parentWin = event.sender.getOwnerBrowserWindow().getParentWindow();
    if (parentWin) {
        parentWin.webContents.send("change_font", selectedFont);
        // Close the modal
        const parentId = Object.keys(docs).find(id => docs[id].win === parentWin);
        if (parentId && docs[parentId].modal && !docs[parentId].modal.isDestroyed()) {
            docs[parentId].modal.close();
        }
    }
});

// Synchronous IPC
electron.ipcMain.on("get_sauce_info", (event, { id, title, author }) => {
    event.returnValue = generateSauceInfo(title, author);
});
```

```javascript
// Renderer Process (app/senders.js)
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

// Usage examples
send("open_font_browser", { id: windowId });
const sauceInfo = send_sync("get_sauce_info", { id, title, author });
on("change_font", (event, fontData) => updateFont(fontData));
```

#### Web/PWA Pattern

```javascript
// Core Event Bus System (web-event-bus.js)
import EventEmitter from 'events';

class WebEventBus extends EventEmitter {
    constructor() {
        super();
        this.documentId = this.generateDocumentId();
        this.handlers = new Map();
        this.responseCallbacks = new Map();
        this.pendingPromises = new Map();
        this.setupGlobalHandlers();
    }

    send(channel, opts = {}) {
        const payload = {
            id: this.documentId,
            timestamp: Date.now(),
            requestId: this.generateRequestId(),
            ...opts
        };
        
        // Emit to local handlers first
        this.emit(channel, payload);
        
        // Broadcast across components via custom events
        window.dispatchEvent(new CustomEvent(`moebius:${channel}`, {
            detail: payload,
            bubbles: true
        }));

        // Support cross-tab communication
        if (window.BroadcastChannel) {
            const bc = new BroadcastChannel('moebius-ipc');
            bc.postMessage({ channel, payload });
        }

        return payload.requestId;
    }

    sendSync(channel, opts = {}) {
        const requestId = this.generateRequestId();
        const payload = {
            id: this.documentId,
            timestamp: Date.now(),
            requestId,
            ...opts
        };

        return new Promise((resolve, reject) => {
            // Set up response handler
            this.responseCallbacks.set(requestId, { resolve, reject });
            
            // Timeout handling
            const timeout = setTimeout(() => {
                this.responseCallbacks.delete(requestId);
                reject(new Error(`IPC timeout for channel: ${channel}`));
            }, 5000);

            // Emit event with response callback
            const eventObj = { 
                returnValue: null,
                respond: (value) => {
                    clearTimeout(timeout);
                    const callback = this.responseCallbacks.get(requestId);
                    if (callback) {
                        this.responseCallbacks.delete(requestId);
                        callback.resolve(value);
                    }
                }
            };

            this.emit(channel, eventObj, payload);
            
            // Also try synchronous response pattern
            if (eventObj.returnValue !== null) {
                clearTimeout(timeout);
                this.responseCallbacks.delete(requestId);
                resolve(eventObj.returnValue);
            }
        });
    }

    on(channel, callback) {
        // Enhanced callback wrapper with response handling
        const wrappedCallback = (eventOrPayload, payload) => {
            if (payload && payload.requestId) {
                // This is a sync request, provide response mechanism
                callback(eventOrPayload, payload);
            } else {
                // Regular async event
                callback(eventOrPayload, payload || eventOrPayload);
            }
        };

        // Register with EventEmitter
        this.addListener(channel, wrappedCallback);
        
        // Register with window events for cross-component communication
        const windowHandler = (event) => {
            callback(event, event.detail);
        };
        window.addEventListener(`moebius:${channel}`, windowHandler);
        
        // Store handlers for cleanup
        this.handlers.set(callback, { 
            wrappedCallback, 
            windowHandler 
        });
        
        return {
            remove: () => {
                const handlers = this.handlers.get(callback);
                if (handlers) {
                    this.removeListener(channel, handlers.wrappedCallback);
                    window.removeEventListener(`moebius:${channel}`, handlers.windowHandler);
                    this.handlers.delete(callback);
                }
            }
        };
    }

    setupGlobalHandlers() {
        // Handle cross-tab messages
        if (window.BroadcastChannel) {
            const bc = new BroadcastChannel('moebius-ipc');
            bc.onmessage = (event) => {
                const { channel, payload } = event.data;
                this.emit(channel, payload);
            };
        }

        // Handle window focus events for proper state management
        window.addEventListener('focus', () => {
            this.emit('window_focus', { id: this.documentId });
        });

        window.addEventListener('blur', () => {
            this.emit('window_blur', { id: this.documentId });
        });
    }

    generateDocumentId() {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Utility methods for common patterns
    async request(channel, opts = {}) {
        return this.sendSync(channel, opts);
    }

    notify(channel, opts = {}) {
        this.send(channel, opts);
    }

    // Bridge method for gradual migration
    handle(channel, handler) {
        this.on(channel, (event, payload) => {
            if (event.respond) {
                // Async handler with response
                const result = handler(payload);
                if (result instanceof Promise) {
                    result.then(event.respond).catch(err => {
                        console.error(`Handler error for ${channel}:`, err);
                        event.respond(null);
                    });
                } else {
                    event.respond(result);
                }
            } else {
                // Simple event handler
                handler(event, payload);
            }
        });
    }
}

// Global instance
const eventBus = new WebEventBus();

// Familiar API exports for easy migration
export function send(channel, opts) {
    return eventBus.send(channel, opts);
}

export function sendSync(channel, opts) {
    return eventBus.sendSync(channel, opts);
}

export function on(channel, callback) {
    return eventBus.on(channel, callback);
}

export function handle(channel, handler) {
    return eventBus.handle(channel, handler);
}

export { eventBus };
```

```javascript
// Application Integration (app/web-main.js)
import { eventBus, handle, on } from './web-event-bus.js';
import { WebWindowManager } from './web-window-manager.js';

const windowManager = new WebWindowManager();
const docs = new Map();

// Migrate main process handlers
handle("open_font_browser", async (payload) => {
    const { id } = payload;
    
    try {
        const modal = await windowManager.createModal("app/html/font_browser.html", {
            width: 800,
            height: 600,
            centered: true
        });
        
        // Store modal reference
        if (docs.has(id)) {
            docs.get(id).modal = modal;
        }
        
        return { success: true, modalId: modal.id };
    } catch (error) {
        console.error("Failed to open font browser:", error);
        return { success: false, error: error.message };
    }
});

handle("font-browser-selection", (payload) => {
    const selectedFont = payload.selectedFont;
    
    // Find parent document and update font
    eventBus.notify("change_font", selectedFont);
    
    // Close modal
    const parentDoc = Array.from(docs.values()).find(doc => doc.modal);
    if (parentDoc && parentDoc.modal) {
        parentDoc.modal.close();
        parentDoc.modal = null;
    }
    
    return { success: true };
});

handle("get_sauce_info", (payload) => {
    const { title, author } = payload;
    return generateSauceInfo(title, author);
});

// Document management
function createDocument(options = {}) {
    const docId = eventBus.generateDocumentId();
    const docData = {
        id: docId,
        modal: null,
        file: null,
        edited: false,
        ...options
    };
    
    docs.set(docId, docData);
    return docData;
}
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- EventEmitter pattern works in all browsers
- Custom events supported everywhere
- localStorage/sessionStorage widely available

**⚠️ Limited Support:**
- BroadcastChannel: Chrome 54+, Firefox 38+, Safari 15.4+
- ServiceWorker messaging as fallback for older browsers

**🚫 Limitations:**
- No true inter-process isolation (security consideration)
- Performance overhead with complex event routing
- Memory leaks possible if handlers not properly cleaned up

**Migration Strategy:**
1. Start with simple async events
2. Add synchronous patterns gradually
3. Implement cross-tab communication last
4. Use feature detection for advanced APIs

---

### 2. File System Operations Migration

**Complexity:** HIGH | **Priority:** CRITICAL | **Effort:** 2-3 weeks

#### Current Electron Pattern

```javascript
// Preferences Storage (app/prefs.js)
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const JSON5 = require("json5");

const file = path.join(electron.app.getPath("userData"), "preferences.json");
const default_values = {
    nick: "Anonymous",
    group: "",
    use_flashing_cursor: false,
    use_pixel_aliasing: false,
    // ... more preferences
};

function set(key, value) {
    prefs[key] = value;
    fs.writeFileSync(file, JSON5.stringify(prefs, undefined, "  "));
}

function get(key) {
    assign_default(key);
    return prefs[key];
}

function load() {
    try {
        prefs = JSON5.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        prefs = {};
    }
}

// File Dialogs (app/controller.js)  
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
        doc.file = file;
        doc.edited = false;
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
        doc.file = files[0];
    }
}
```

#### Web/PWA Pattern

```javascript
// Web File System Abstraction (web-file-system.js)
class WebFileSystem {
    constructor() {
        this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
        this.supportsIndexedDB = 'indexedDB' in window;
        this.db = null;
        this.initDB();
    }

    async initDB() {
        if (!this.supportsIndexedDB) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoebiusXBIN', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Preferences store
                if (!db.objectStoreNames.contains('preferences')) {
                    const prefStore = db.createObjectStore('preferences', { keyPath: 'key' });
                    prefStore.createIndex('timestamp', 'timestamp');
                }
                
                // File cache store for recent files
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'path' });
                    fileStore.createIndex('lastAccess', 'lastAccess');
                }
                
                // Document backups
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    backupStore.createIndex('documentId', 'documentId');
                    backupStore.createIndex('timestamp', 'timestamp');
                }
            };
        });
    }

    // Preferences Management
    async setPreference(key, value) {
        // Primary: localStorage for quick access
        try {
            const prefs = this.getAllPreferences();
            prefs[key] = value;
            localStorage.setItem('moebiusxbin_preferences', JSON.stringify(prefs));
        } catch (error) {
            console.warn('localStorage failed, using IndexedDB:', error);
        }
        
        // Backup: IndexedDB for reliability
        if (this.db) {
            try {
                const transaction = this.db.transaction(['preferences'], 'readwrite');
                const store = transaction.objectStore('preferences');
                await store.put({
                    key,
                    value,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('IndexedDB preference storage failed:', error);
            }
        }
    }

    getPreference(key, defaultValue = null) {
        try {
            const prefs = this.getAllPreferences();
            return prefs[key] !== undefined ? prefs[key] : defaultValue;
        } catch (error) {
            console.warn('Preference retrieval failed:', error);
            return defaultValue;
        }
    }

    getAllPreferences() {
        try {
            const stored = localStorage.getItem('moebiusxbin_preferences');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('localStorage access failed:', error);
            return {};
        }
    }

    // File Operations
    async saveAs(data, suggestedName = 'untitled.ans', options = {}) {
        const fileTypes = options.fileTypes || [{
            description: 'ANSI Art Files',
            accept: {
                'text/plain': ['.ans', '.xb', '.bin', '.diz', '.nfo', '.asc']
            }
        }];

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
                types: fileTypes,
                excludeAcceptAllOption: false
            });

            // Create writable stream
            const writable = await fileHandle.createWritable();
            
            // Write data (handle different data types)
            if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
                await writable.write(data);
            } else {
                await writable.write(new TextEncoder().encode(data));
            }
            
            await writable.close();
            
            // Cache file handle for quick saves
            await this.cacheFileHandle(fileHandle.name, fileHandle);
            
            return {
                success: true,
                filename: fileHandle.name,
                handle: fileHandle
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            throw error;
        }
    }

    saveWithDownload(data, filename) {
        try {
            // Create blob with appropriate type
            const mimeType = this.getMimeTypeFromExtension(filename);
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return {
                success: true,
                filename,
                method: 'download'
            };
        } catch (error) {
            console.error('Download save failed:', error);
            return { success: false, error: error.message };
        }
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
                }],
                multiple: false
            });

            const file = await fileHandle.getFile();
            const data = await file.arrayBuffer();
            
            // Cache file handle for quick saves
            await this.cacheFileHandle(file.name, fileHandle);
            
            return {
                success: true,
                filename: file.name,
                data: new Uint8Array(data),
                handle: fileHandle,
                lastModified: file.lastModified
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            throw error;
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
                    try {
                        const data = await file.arrayBuffer();
                        resolve({
                            success: true,
                            filename: file.name,
                            data: new Uint8Array(data),
                            lastModified: file.lastModified
                        });
                    } catch (error) {
                        resolve({ success: false, error: error.message });
                    }
                } else {
                    resolve({ success: false, cancelled: true });
                }
            };
            
            input.onclick = () => {
                input.value = null; // Allow re-selecting same file
            };
            
            input.click();
        });
    }

    // Quick save using cached file handle
    async quickSave(data, fileHandle) {
        if (!this.supportsFileSystemAccess || !fileHandle) {
            throw new Error('Quick save not supported or no file handle');
        }

        try {
            const writable = await fileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            return { success: true };
        } catch (error) {
            console.error('Quick save failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    getMimeTypeFromExtension(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        const mimeTypes = {
            'ans': 'text/plain',
            'xb': 'application/octet-stream',
            'bin': 'application/octet-stream',
            'diz': 'text/plain',
            'nfo': 'text/plain',
            'asc': 'text/plain'
        };
        return mimeTypes[ext] || 'text/plain';
    }

    // File handle caching for File System Access API
    async cacheFileHandle(filename, handle) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            await store.put({
                path: filename,
                handle: handle,
                lastAccess: Date.now()
            });
        } catch (error) {
            console.warn('File handle caching failed:', error);
        }
    }
}

// Global instance
const webFileSystem = new WebFileSystem();

// Bridge API to maintain compatibility (web-prefs-bridge.js)
const default_values = {
    nick: "Anonymous",
    group: "",
    use_flashing_cursor: false,
    use_pixel_aliasing: false,
    // ... rest of defaults
};

export function set(key, value) {
    return webFileSystem.setPreference(key, value);
}

export function get(key) {
    return webFileSystem.getPreference(key, default_values[key]);
}

export function get_all() {
    const prefs = webFileSystem.getAllPreferences();
    for (const key of Object.keys(default_values)) {
        if (prefs[key] === undefined) {
            prefs[key] = default_values[key];
        }
    }
    return prefs;
}

export async function save_as(data, filename, options) {
    return webFileSystem.saveAs(data, filename, options);
}

export async function open_file() {
    return webFileSystem.openFile();
}

export { webFileSystem };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- localStorage: IE8+, all modern browsers
- IndexedDB: IE10+, all modern browsers
- File API (input): IE10+, all modern browsers
- Blob/URL.createObjectURL: IE10+, all modern browsers

**⚠️ Limited Support:**
- File System Access API: Chrome 86+, Edge 86+ (experimental in other browsers)
- ServiceWorker: Chrome 40+, Firefox 44+, Safari 11.1+

**🚫 Limitations:**
- No direct file system access outside sandboxed storage
- File handles lost on page refresh (Chrome working on persistence)
- Limited storage quota (can be increased via Persistent Storage API)
- No automatic backups to system locations

**Migration Strategy:**
1. Implement localStorage-based preferences first
2. Add IndexedDB backup layer
3. Implement File System Access API with fallbacks
4. Create migration utilities for existing Electron user data

---

### 3. Multi-Window Management Migration

**Complexity:** HIGH | **Priority:** HIGH | **Effort:** 3-4 weeks

#### Current Electron Pattern

```javascript
// Window Creation (app/window.js)
const electron = require("electron");

async function new_win(file, options, touchbar, touchbar_opts) {
    return new Promise((resolve) => {
        const win = new electron.BrowserWindow({
            ...options, 
            show: false, 
            useContentSize: true, 
            webPreferences: { 
                nodeIntegration: true, 
                enableRemoteModule: true, 
                contextIsolation: false,
            }
        });
        
        if (touchbar) touchbar(win, touchbar_opts);
        win.on("ready-to-show", (event) => {
            win.show();
            resolve(win);
        });
        win.loadFile(file);
    });
}

async function new_doc() {
    return await new_win("app/html/document.html", {
        width: 1280, 
        height: 800, 
        minWidth: 800, 
        minHeight: 500, 
        backgroundColor: "#292c33"
    });
}

async function new_modal(file, window_opts, touchbar, touchbar_opts) {
    const win = await new_win(file, {...window_opts, ...modal_prefs}, touchbar, touchbar_opts);
    if (!darwin) win.setMenuBarVisibility(false);
    return win;
}

// Document Management (app/moebius.js)
const docs = {};

async function create_window() {
    const win = await window.new_doc();
    const id = win.id;
    
    docs[id] = {
        win: win,
        modal: null,
        file: null,
        edited: false,
        canvas: null,
        art: art,
        font: null
    };
    
    win.on("close", () => {
        if (docs[id].modal && !docs[id].modal.isDestroyed()) {
            docs[id].modal.close();
        }
        delete docs[id];
    });
}
```

#### Web/PWA Pattern

```javascript
// Web Window Manager (web-window-manager.js)
class WebWindowManager {
    constructor() {
        this.windows = new Map();
        this.modals = new Map();
        this.zIndexCounter = 1000;
        this.activeWindow = null;
        this.setupContainer();
        this.setupGlobalHandlers();
    }

    setupContainer() {
        // Create main container for all windows
        if (!document.getElementById('window-container')) {
            const container = document.createElement('div');
            container.id = 'window-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            `;
            document.body.appendChild(container);
        }
        
        // Create modal overlay container
        if (!document.getElementById('modal-container')) {
            const modalContainer = document.createElement('div');
            modalContainer.id = 'modal-container';
            modalContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 2000;
            `;
            document.body.appendChild(modalContainer);
        }
    }

    setupGlobalHandlers() {
        // Handle escape key for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });

        // Handle window focus management
        document.addEventListener('click', (e) => {
            const windowElement = e.target.closest('.web-window');
            if (windowElement) {
                this.focusWindow(windowElement.dataset.windowId);
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.adjustWindowPositions();
        });
    }

    async createWindow(contentUrl, options = {}) {
        const windowId = this.generateId();
        const windowElement = await this.createWindowElement(contentUrl, windowId, options);
        
        const windowData = {
            id: windowId,
            element: windowElement,
            contentUrl,
            options,
            isModal: false,
            data: {
                file: null,
                edited: false,
                canvas: null,
                modal: null
            }
        };
        
        this.windows.set(windowId, windowData);
        this.focusWindow(windowId);
        
        return windowData;
    }

    async createWindowElement(contentUrl, windowId, options) {
        const defaults = {
            width: 1280,
            height: 800,
            minWidth: 800,
            minHeight: 500,
            backgroundColor: '#292c33',
            title: 'Document',
            resizable: true,
            closable: true
        };
        
        const config = { ...defaults, ...options };
        
        // Create window frame
        const windowElement = document.createElement('div');
        windowElement.className = 'web-window';
        windowElement.dataset.windowId = windowId;
        windowElement.style.cssText = `
            position: absolute;
            background: ${config.backgroundColor};
            border: 1px solid #444;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            width: ${config.width}px;
            height: ${config.height}px;
            min-width: ${config.minWidth}px;
            min-height: ${config.minHeight}px;
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            z-index: ${++this.zIndexCounter};
        `;
        
        // Position window (cascade new windows)
        const position = this.calculateWindowPosition(config);
        windowElement.style.left = position.x + 'px';
        windowElement.style.top = position.y + 'px';
        
        // Create title bar
        const titleBar = this.createTitleBar(windowId, config);
        windowElement.appendChild(titleBar);
        
        // Create content area
        const contentArea = document.createElement('div');
        contentArea.className = 'window-content';
        contentArea.style.cssText = `
            flex: 1;
            overflow: auto;
            position: relative;
        `;
        
        // Load content
        try {
            const response = await fetch(contentUrl);
            const html = await response.text();
            contentArea.innerHTML = html;
            
            // Execute any scripts in the loaded content
            this.executeScripts(contentArea, windowId);
        } catch (error) {
            contentArea.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b;">
                    <h3>Error Loading Content</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
        
        windowElement.appendChild(contentArea);
        
        // Add resize functionality
        if (config.resizable) {
            this.makeResizable(windowElement);
        }
        
        // Add to container
        document.getElementById('window-container').appendChild(windowElement);
        
        return windowElement;
    }

    createTitleBar(windowId, config) {
        const titleBar = document.createElement('div');
        titleBar.className = 'window-title-bar';
        titleBar.style.cssText = `
            height: 32px;
            background: linear-gradient(to bottom, #555, #333);
            border-bottom: 1px solid #222;
            display: flex;
            align-items: center;
            padding: 0 8px;
            cursor: move;
            user-select: none;
            border-radius: 7px 7px 0 0;
        `;
        
        // Title
        const title = document.createElement('span');
        title.textContent = config.title;
        title.style.cssText = `
            flex: 1;
            color: #fff;
            font-size: 13px;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        // Window controls
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 4px;
        `;
        
        if (config.closable) {
            const closeBtn = this.createControlButton('×', '#ff5f56', () => {
                this.closeWindow(windowId);
            });
            controls.appendChild(closeBtn);
        }
        
        titleBar.appendChild(title);
        titleBar.appendChild(controls);
        
        // Make draggable
        this.makeDraggable(titleBar, windowId);
        
        return titleBar;
    }

    createControlButton(text, color, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: none;
            background: ${color};
            color: rgba(0,0,0,0.8);
            font-size: 8px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        
        return button;
    }

    makeDraggable(handle, windowId) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        
        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            const windowElement = this.windows.get(windowId)?.element;
            if (!windowElement) return;
            
            const rect = windowElement.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            
            this.focusWindow(windowId);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const windowElement = this.windows.get(windowId)?.element;
            if (!windowElement) return;
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            // Constrain to viewport
            const maxX = window.innerWidth - windowElement.offsetWidth;
            const maxY = window.innerHeight - windowElement.offsetHeight;
            
            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));
            
            windowElement.style.left = currentX + 'px';
            windowElement.style.top = currentY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    makeResizable(windowElement) {
        const resizer = document.createElement('div');
        resizer.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 16px;
            height: 16px;
            cursor: se-resize;
            background: linear-gradient(-45deg, transparent 40%, #666 40%, #666 60%, transparent 60%);
        `;
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(window.getComputedStyle(windowElement).width, 10);
            startHeight = parseInt(window.getComputedStyle(windowElement).height, 10);
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const width = startWidth + e.clientX - startX;
            const height = startHeight + e.clientY - startY;
            
            const minWidth = parseInt(windowElement.style.minWidth) || 400;
            const minHeight = parseInt(windowElement.style.minHeight) || 300;
            
            windowElement.style.width = Math.max(width, minWidth) + 'px';
            windowElement.style.height = Math.max(height, minHeight) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
        
        windowElement.appendChild(resizer);
    }

    async createModal(contentUrl, options = {}) {
        const modalId = this.generateId();
        const modal = await this.createModalElement(contentUrl, modalId, options);
        
        const modalData = {
            id: modalId,
            element: modal,
            contentUrl,
            options
        };
        
        this.modals.set(modalId, modalData);
        
        return modalData;
    }

    async createModalElement(contentUrl, modalId, options) {
        const defaults = {
            width: 800,
            height: 600,
            backgroundColor: '#292c33',
            title: 'Modal',
            centered: true
        };
        
        const config = { ...defaults, ...options };
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.dataset.modalId = modalId;
        overlay.style.cssText = `
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
            pointer-events: auto;
        `;
        
        // Create modal window
        const modalWindow = document.createElement('div');
        modalWindow.className = 'modal-window';
        modalWindow.style.cssText = `
            background: ${config.backgroundColor};
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            width: ${config.width}px;
            height: ${config.height}px;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Create title bar
        const titleBar = this.createModalTitleBar(modalId, config);
        modalWindow.appendChild(titleBar);
        
        // Create content area
        const contentArea = document.createElement('div');
        contentArea.className = 'modal-content';
        contentArea.style.cssText = `
            flex: 1;
            overflow: auto;
            position: relative;
        `;
        
        // Load content
        try {
            const response = await fetch(contentUrl);
            const html = await response.text();
            contentArea.innerHTML = html;
            
            // Execute scripts in modal context
            this.executeScripts(contentArea, modalId);
        } catch (error) {
            contentArea.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b;">
                    <h3>Error Loading Modal Content</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
        
        modalWindow.appendChild(contentArea);
        overlay.appendChild(modalWindow);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal(modalId);
            }
        });
        
        // Add to modal container
        document.getElementById('modal-container').appendChild(overlay);
        
        return overlay;
    }

    createModalTitleBar(modalId, config) {
        const titleBar = document.createElement('div');
        titleBar.className = 'modal-title-bar';
        titleBar.style.cssText = `
            height: 32px;
            background: linear-gradient(to bottom, #555, #333);
            border-bottom: 1px solid #222;
            display: flex;
            align-items: center;
            padding: 0 12px;
            border-radius: 7px 7px 0 0;
        `;
        
        const title = document.createElement('span');
        title.textContent = config.title;
        title.style.cssText = `
            flex: 1;
            color: #fff;
            font-size: 13px;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        const closeBtn = this.createControlButton('×', '#ff5f56', () => {
            this.closeModal(modalId);
        });
        
        titleBar.appendChild(title);
        titleBar.appendChild(closeBtn);
        
        return titleBar;
    }

    executeScripts(container, windowId) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src) {
                // External script
                const newScript = document.createElement('script');
                newScript.src = script.src;
                newScript.async = true;
                document.head.appendChild(newScript);
            } else {
                // Inline script - create isolated execution context
                try {
                    const func = new Function('windowId', 'windowElement', script.textContent);
                    const windowElement = this.windows.get(windowId)?.element || 
                                         this.modals.get(windowId)?.element;
                    func(windowId, windowElement);
                } catch (error) {
                    console.error('Script execution error:', error);
                }
            }
        });
    }

    focusWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        // Bring to front
        windowData.element.style.zIndex = ++this.zIndexCounter;
        this.activeWindow = windowId;
        
        // Update visual focus state
        document.querySelectorAll('.web-window').forEach(win => {
            win.classList.remove('focused');
        });
        windowData.element.classList.add('focused');
        
        // Emit focus event
        window.dispatchEvent(new CustomEvent('moebius:window_focus', {
            detail: { windowId, windowData }
        }));
    }

    closeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        // Close any associated modals
        if (windowData.data.modal) {
            this.closeModal(windowData.data.modal.id);
        }
        
        // Remove from DOM
        windowData.element.remove();
        
        // Clean up
        this.windows.delete(windowId);
        
        // Focus next window
        if (this.activeWindow === windowId) {
            const remaining = Array.from(this.windows.keys());
            if (remaining.length > 0) {
                this.focusWindow(remaining[remaining.length - 1]);
            } else {
                this.activeWindow = null;
            }
        }
        
        // Emit close event
        window.dispatchEvent(new CustomEvent('moebius:window_close', {
            detail: { windowId }
        }));
    }

    closeModal(modalId) {
        const modalData = this.modals.get(modalId);
        if (!modalData) return;
        
        modalData.element.remove();
        this.modals.delete(modalId);
        
        // Emit close event
        window.dispatchEvent(new CustomEvent('moebius:modal_close', {
            detail: { modalId }
        }));
    }

    closeTopModal() {
        const modals = Array.from(this.modals.values());
        if (modals.length > 0) {
            const topModal = modals[modals.length - 1];
            this.closeModal(topModal.id);
        }
    }

    calculateWindowPosition(config) {
        const windowCount = this.windows.size;
        const offset = windowCount * 30; // Cascade offset
        
        return {
            x: 50 + offset,
            y: 50 + offset
        };
    }

    adjustWindowPositions() {
        // Ensure all windows remain in viewport after resize
        this.windows.forEach(windowData => {
            const element = windowData.element;
            const rect = element.getBoundingClientRect();
            
            if (rect.right > window.innerWidth) {
                element.style.left = (window.innerWidth - element.offsetWidth) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                element.style.top = (window.innerHeight - element.offsetHeight) + 'px';
            }
        });
    }

    generateId() {
        return `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public API
    getWindow(windowId) {
        return this.windows.get(windowId);
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }

    getActiveWindow() {
        return this.activeWindow ? this.windows.get(this.activeWindow) : null;
    }
}

// Global instance
const windowManager = new WebWindowManager();

// Bridge API for compatibility
export async function new_doc(options) {
    return await windowManager.createWindow('app/html/document.html', {
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 500,
        backgroundColor: '#292c33',
        title: 'Document',
        ...options
    });
}

export async function new_modal(file, window_opts = {}) {
    return await windowManager.createModal(file, window_opts);
}

export { windowManager, WebWindowManager };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- DOM manipulation and CSS positioning
- Event handling and custom events
- Flexbox layout for window structure

**⚠️ Considerations:**
- Performance with many windows (DOM overhead)
- Mobile device limitations (small screens)
- Touch device interactions

**🚫 Limitations:**
- No true OS-level window management
- Cannot minimize to taskbar/dock
- No native window snapping/tiling
- Security restrictions for cross-origin content

**Migration Strategy:**
1. Start with single document window
2. Add modal support
3. Implement multi-document tabs as intermediate step
4. Add full window management features

---

### 4. Font Management System Migration

**Complexity:** HIGH | **Priority:** MEDIUM | **Effort:** 2-3 weeks

#### Current Electron Pattern

```javascript
// Font Registry (app/font_registry.js)
const fs = require("fs");
const path = require("path");

class FontRegistry {
    constructor() {
        this.fonts = new Map();
        this.loadSystemFonts();
    }

    loadSystemFonts() {
        const fontDir = path.join(__dirname, "fonts");
        const files = fs.readdirSync(fontDir);
        
        files.forEach(file => {
            if (file.endsWith('.f')) {
                const fontPath = path.join(fontDir, file);
                const fontData = fs.readFileSync(fontPath);
                const fontInfo = this.parseFontHeader(fontData);
                
                this.fonts.set(fontInfo.name, {
                    data: fontData,
                    path: fontPath,
                    info: fontInfo
                });
            }
        });
    }

    parseFontHeader(buffer) {
        // Parse font metadata from binary data
        const name = this.extractFontName(buffer);
        const width = buffer[0] || 8;
        const height = buffer.length === 4096 ? 16 : 8;
        
        return { name, width, height };
    }

    getFont(name) {
        return this.fonts.get(name);
    }

    addCustomFont(filePath) {
        const fontData = fs.readFileSync(filePath);
        const fontInfo = this.parseFontHeader(fontData);
        
        this.fonts.set(fontInfo.name, {
            data: fontData,
            path: filePath,
            info: fontInfo,
            custom: true
        });
    }
}

// Font Loading (app/libtextmode/font.js)
function load_font(fontPath) {
    const buffer = fs.readFileSync(fontPath);
    return parse_font_data(buffer);
}
```

#### Web/PWA Pattern

```javascript
// Web Font Registry (web-font-registry.js)
class WebFontRegistry {
    constructor() {
        this.fonts = new Map();
        this.loadedFonts = new Set();
        this.fontCache = new Map();
        this.db = null;
        this.initDB();
        this.initDefaultFonts();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoebiusFonts', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('fonts')) {
                    const fontStore = db.createObjectStore('fonts', { keyPath: 'name' });
                    fontStore.createIndex('category', 'category');
                    fontStore.createIndex('custom', 'custom');
                }
                
                if (!db.objectStoreNames.contains('fontManifest')) {
                    db.createObjectStore('fontManifest', { keyPath: 'version' });
                }
            };
        });
    }

    async initDefaultFonts() {
        try {
            // Load font manifest
            const response = await fetch('/fonts/manifest.json');
            const manifest = await response.json();
            
            // Load each font in the manifest
            for (const fontInfo of manifest.fonts) {
                await this.loadFontFromUrl(`/fonts/${fontInfo.file}`, fontInfo);
            }
        } catch (error) {
            console.warn('Failed to load font manifest, using fallbacks:', error);
            await this.loadFallbackFonts();
        }
    }

    async loadFallbackFonts() {
        // Essential bitmap fonts for ASCII art
        const fallbackFonts = [
            { name: 'IBM VGA 8x16', file: 'IBM_VGA_8x16.f', width: 8, height: 16 },
            { name: 'IBM VGA 8x14', file: 'IBM_VGA_8x14.f', width: 8, height: 14 },
            { name: 'IBM VGA 8x8', file: 'IBM_VGA_8x8.f', width: 8, height: 8 }
        ];
        
        for (const fontInfo of fallbackFonts) {
            try {
                await this.loadFontFromUrl(`/fonts/${fontInfo.file}`, fontInfo);
            } catch (error) {
                console.warn(`Could not load fallback font ${fontInfo.name}`);
                
                // Create synthetic font as last resort
                this.createSyntheticFont(fontInfo);
            }
        }
    }

    async loadFontFromUrl(url, fontInfo) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const fontData = new Uint8Array(arrayBuffer);
            
            // Parse font metadata
            const parsedInfo = this.parseFontData(fontData, fontInfo);
            
            // Store font
            this.fonts.set(parsedInfo.name, {
                data: fontData,
                info: parsedInfo,
                url: url,
                loaded: true
            });
            
            // Create web font if applicable
            if (parsedInfo.format === 'truetype' || parsedInfo.format === 'woff') {
                await this.createWebFont(parsedInfo.name, fontData);
            }
            
            this.loadedFonts.add(parsedInfo.name);
            
            return parsedInfo;
        } catch (error) {
            console.error(`Failed to load font from ${url}:`, error);
            throw error;
        }
    }

    async createWebFont(name, fontData) {
        try {
            const fontFace = new FontFace(name, fontData, {
                style: 'normal',
                weight: 'normal'
            });
            
            await fontFace.load();
            document.fonts.add(fontFace);
            
            return fontFace;
        } catch (error) {
            console.warn(`Failed to create web font for ${name}:`, error);
        }
    }

    parseFontData(fontData, providedInfo = {}) {
        // Detect font format
        const format = this.detectFontFormat(fontData);
        
        let info = {
            name: providedInfo.name || 'Unknown Font',
            format: format,
            size: fontData.length,
            custom: providedInfo.custom || false,
            category: providedInfo.category || 'bitmap'
        };
        
        if (format === 'bitmap') {
            // Parse bitmap font dimensions
            const dimensions = this.parseBitmapDimensions(fontData);
            info = { ...info, ...dimensions };
        } else if (format === 'truetype' || format === 'opentype') {
            // Parse TrueType/OpenType metadata
            const metadata = this.parseTrueTypeMetadata(fontData);
            info = { ...info, ...metadata };
        }
        
        return info;
    }

    detectFontFormat(fontData) {
        // Check magic bytes to determine format
        const header = Array.from(fontData.slice(0, 4));
        
        if (header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00) {
            return 'truetype';
        } else if (header[0] === 0x4F && header[1] === 0x54 && header[2] === 0x54 && header[3] === 0x4F) {
            return 'opentype';
        } else if (fontData.slice(0, 4).every(byte => byte >= 0x77 && byte <= 0x66)) {
            return 'woff';
        } else {
            return 'bitmap';
        }
    }

    parseBitmapDimensions(fontData) {
        // Common bitmap font sizes based on data length
        const sizeMap = {
            256: { width: 8, height: 8, chars: 256 },
            512: { width: 8, height: 8, chars: 512 },
            2048: { width: 8, height: 8, chars: 256 },
            3584: { width: 8, height: 14, chars: 256 },
            4096: { width: 8, height: 16, chars: 256 },
            8192: { width: 8, height: 16, chars: 512 }
        };
        
        const size = fontData.length;
        return sizeMap[size] || { width: 8, height: 16, chars: 256 };
    }

    parseTrueTypeMetadata(fontData) {
        // Basic TrueType parsing - this would need a proper font parser
        // For now, return defaults
        return {
            width: 'variable',
            height: 'variable',
            scalable: true
        };
    }

    createSyntheticFont(fontInfo) {
        // Create a basic synthetic bitmap font
        const { width, height } = fontInfo;
        const charCount = 256;
        const fontData = new Uint8Array(width * height * charCount / 8);
        
        // Fill with basic pattern for visibility
        for (let i = 0; i < fontData.length; i += 2) {
            fontData[i] = 0xAA;     // Alternating pattern
            fontData[i + 1] = 0x55;
        }
        
        this.fonts.set(fontInfo.name, {
            data: fontData,
            info: {
                ...fontInfo,
                format: 'bitmap',
                synthetic: true
            },
            loaded: true
        });
        
        this.loadedFonts.add(fontInfo.name);
    }

    async addCustomFont(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const fontData = new Uint8Array(arrayBuffer);
            
            // Parse font info
            const fontInfo = this.parseFontData(fontData, {
                name: file.name.replace(/\.[^/.]+$/, ''),
                custom: true
            });
            
            // Store in memory
            this.fonts.set(fontInfo.name, {
                data: fontData,
                info: fontInfo,
                loaded: true,
                file: file
            });
            
            // Persist to IndexedDB
            await this.persistFont(fontInfo.name, fontData, fontInfo);
            
            this.loadedFonts.add(fontInfo.name);
            
            // Create web font if applicable
            if (fontInfo.format === 'truetype' || fontInfo.format === 'woff') {
                await this.createWebFont(fontInfo.name, fontData);
            }
            
            return fontInfo;
        } catch (error) {
            throw new Error(`Failed to add custom font: ${error.message}`);
        }
    }

    async persistFont(name, data, info) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['fonts'], 'readwrite');
            const store = transaction.objectStore('fonts');
            
            await store.put({
                name,
                data: Array.from(data), // Convert Uint8Array for storage
                info,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Font persistence failed:', error);
        }
    }

    async loadPersistedFonts() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['fonts'], 'readonly');
            const store = transaction.objectStore('fonts');
            const request = store.getAll();
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const persistedFonts = request.result;
                    
                    persistedFonts.forEach(fontRecord => {
                        const fontData = new Uint8Array(fontRecord.data);
                        
                        this.fonts.set(fontRecord.name, {
                            data: fontData,
                            info: fontRecord.info,
                            loaded: true,
                            persisted: true
                        });
                        
                        this.loadedFonts.add(fontRecord.name);
                    });
                    
                    resolve(persistedFonts.length);
                };
                
                request.onerror = () => resolve(0);
            });
        } catch (error) {
            console.error('Failed to load persisted fonts:', error);
            return 0;
        }
    }

    getFont(name) {
        return this.fonts.get(name);
    }

    getAllFonts() {
        return Array.from(this.fonts.entries()).map(([name, fontData]) => ({
            name,
            ...fontData.info,
            loaded: fontData.loaded
        }));
    }

    getFontsByCategory(category) {
        return this.getAllFonts().filter(font => font.category === category);
    }

    getCustomFonts() {
        return this.getAllFonts().filter(font => font.custom);
    }

    async removeFont(name) {
        const fontData = this.fonts.get(name);
        if (!fontData || !fontData.info.custom) {
            throw new Error('Cannot remove system font');
        }
        
        // Remove from memory
        this.fonts.delete(name);
        this.loadedFonts.delete(name);
        
        // Remove from IndexedDB
        if (this.db) {
            try {
                const transaction = this.db.transaction(['fonts'], 'readwrite');
                const store = transaction.objectStore('fonts');
                await store.delete(name);
            } catch (error) {
                console.error('Failed to remove persisted font:', error);
            }
        }
        
        // Remove web font
        if (document.fonts) {
            document.fonts.forEach(fontFace => {
                if (fontFace.family === name) {
                    document.fonts.delete(fontFace);
                }
            });
        }
    }

    // Canvas rendering support for bitmap fonts
    renderCharacter(fontName, charCode, canvas, x, y) {
        const font = this.getFont(fontName);
        if (!font || font.info.format !== 'bitmap') {
            throw new Error(`Bitmap font ${fontName} not found`);
        }
        
        const { width, height } = font.info;
        const ctx = canvas.getContext('2d');
        const fontData = font.data;
        
        // Calculate character offset in font data
        const charOffset = charCode * height;
        
        // Render character pixel by pixel
        for (let row = 0; row < height; row++) {
            const byteOffset = charOffset + row;
            if (byteOffset >= fontData.length) break;
            
            const byte = fontData[byteOffset];
            
            for (let col = 0; col < width; col++) {
                const bit = (byte >> (7 - col)) & 1;
                if (bit) {
                    ctx.fillRect(x + col, y + row, 1, 1);
                }
            }
        }
    }

    // Font preview generation
    async generatePreview(fontName, text = 'Sample Text') {
        const font = this.getFont(fontName);
        if (!font) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (font.info.format === 'bitmap') {
            // Render bitmap font preview
            const { width, height } = font.info;
            canvas.width = text.length * width;
            canvas.height = height;
            
            ctx.fillStyle = '#ffffff';
            
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i);
                this.renderCharacter(fontName, charCode, canvas, i * width, 0);
            }
        } else {
            // Render scalable font preview
            canvas.width = 200;
            canvas.height = 32;
            
            ctx.font = `16px "${fontName}"`;
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 10, 16);
        }
        
        return canvas.toDataURL();
    }
}

// Global instance and bridge API
const fontRegistry = new WebFontRegistry();

// Compatibility bridge
export async function load_font(fontName) {
    const font = fontRegistry.getFont(fontName);
    if (!font) {
        throw new Error(`Font ${fontName} not found`);
    }
    return font.data;
}

export function get_font_list() {
    return fontRegistry.getAllFonts().filter(font => !font.custom);
}

export function get_custom_font_list() {
    return fontRegistry.getCustomFonts();
}

export async function add_custom_font(file) {
    return fontRegistry.addCustomFont(file);
}

export { fontRegistry, WebFontRegistry };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- Canvas 2D rendering for bitmap fonts
- Blob handling for font data
- FontFace API: Chrome 35+, Firefox 41+, Safari 10+

**⚠️ Limited Support:**
- Advanced font parsing requires libraries
- Some font formats may not render correctly
- Performance varies with font complexity

**🚫 Limitations:**
- No direct file system font enumeration
- Limited bitmap font format support
- Font hinting may differ from desktop

**Migration Strategy:**
1. Implement bitmap font support first (core ASCII art)
2. Add TrueType/OpenType support for text
3. Create font conversion utilities
4. Add custom font management UI

---

## 🟡 MEDIUM COMPLEXITY MIGRATIONS

### 5. Native Dialog System Migration

**Complexity:** MEDIUM | **Priority:** HIGH | **Effort:** 2-3 weeks

#### Current Electron Pattern

```javascript
// Message Dialogs (app/senders.js)
const electron = require("electron");

function msg_box(message, detail, opts = {}) {
    return electron.remote.dialog.showMessageBoxSync(win, {
        type: opts.type || 'info',
        title: opts.title || 'MoebiusXBIN',
        message: message,
        detail: detail,
        buttons: opts.buttons || ['OK'],
        defaultId: opts.defaultId || 0,
        cancelId: opts.cancelId
    });
}

function error_box(title, content) {
    electron.remote.dialog.showErrorBox(title, content);
}

function confirm_box(message, detail) {
    const result = electron.remote.dialog.showMessageBoxSync(win, {
        type: 'question',
        title: 'Confirm',
        message: message,
        detail: detail,
        buttons: ['Cancel', 'OK'],
        defaultId: 1,
        cancelId: 0
    });
    return result === 1;
}

// File Save Dialog
function save_box(default_file, ext, opts = {}) {
    return electron.remote.dialog.showSaveDialogSync(win, {
        defaultPath: `${default_file}.${ext}`,
        filters: opts.filters || [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
}
```

#### Web/PWA Pattern

```javascript
// Web Dialog System (web-dialog-system.js)
class WebDialogSystem {
    constructor() {
        this.dialogCounter = 0;
        this.activeDialogs = new Map();
        this.setupStyles();
    }

    setupStyles() {
        if (document.getElementById('dialog-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'dialog-styles';
        styles.textContent = `
            .dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .dialog-overlay.show {
                opacity: 1;
            }
            
            .dialog-box {
                background: #2c2c2c;
                border: 1px solid #555;
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                min-width: 300px;
                max-width: 600px;
                max-height: 80vh;
                transform: scale(0.9);
                transition: transform 0.2s ease;
                overflow: hidden;
            }
            
            .dialog-overlay.show .dialog-box {
                transform: scale(1);
            }
            
            .dialog-header {
                background: linear-gradient(to bottom, #444, #333);
                color: #fff;
                padding: 12px 16px;
                font-size: 14px;
                font-weight: 600;
                border-bottom: 1px solid #555;
                font-family: system-ui, -apple-system, sans-serif;
            }
            
            .dialog-content {
                padding: 20px;
                color: #e0e0e0;
                font-family: system-ui, -apple-system, sans-serif;
            }
            
            .dialog-message {
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 8px;
            }
            
            .dialog-detail {
                font-size: 12px;
                color: #aaa;
                line-height: 1.3;
                margin-bottom: 20px;
            }
            
            .dialog-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 20px;
            }
            
            .dialog-button {
                padding: 8px 16px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #404040;
                color: #fff;
                cursor: pointer;
                font-size: 12px;
                font-family: system-ui, -apple-system, sans-serif;
                transition: background-color 0.2s;
            }
            
            .dialog-button:hover {
                background: #4a4a4a;
            }
            
            .dialog-button.primary {
                background: #0066cc;
                border-color: #0066cc;
            }
            
            .dialog-button.primary:hover {
                background: #0052a3;
            }
            
            .dialog-button.danger {
                background: #d73a49;
                border-color: #d73a49;
            }
            
            .dialog-button.danger:hover {
                background: #b31d28;
            }
            
            .dialog-icon {
                width: 32px;
                height: 32px;
                margin: 0 12px 16px 0;
                float: left;
                background-size: contain;
                background-repeat: no-repeat;
            }
            
            .dialog-icon.info {
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%234a90e2"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>');
            }
            
            .dialog-icon.warning {
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%23f5a623"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>');
            }
            
            .dialog-icon.error {
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2024 24" stroke="%23d73a49"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>');
            }
            
            .dialog-icon.question {
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%234a90e2"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>');
            }
        `;
        document.head.appendChild(styles);
    }

    async showMessageBox(options = {}) {
        const defaults = {
            type: 'info',
            title: 'MoebiusXBIN',
            message: '',
            detail: '',
            buttons: ['OK'],
            defaultId: 0,
            cancelId: -1
        };
        
        const config = { ...defaults, ...options };
        
        return new Promise((resolve) => {
            const dialogId = ++this.dialogCounter;
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';
            overlay.dataset.dialogId = dialogId;
            
            // Create dialog box
            const dialogBox = document.createElement('div');
            dialogBox.className = 'dialog-box';
            
            // Header
            const header = document.createElement('div');
            header.className = 'dialog-header';
            header.textContent = config.title;
            
            // Content
            const content = document.createElement('div');
            content.className = 'dialog-content';
            
            // Icon
            if (config.type !== 'none') {
                const icon = document.createElement('div');
                icon.className = `dialog-icon ${config.type}`;
                content.appendChild(icon);
            }
            
            // Message
            const message = document.createElement('div');
            message.className = 'dialog-message';
            message.textContent = config.message;
            content.appendChild(message);
            
            // Detail
            if (config.detail) {
                const detail = document.createElement('div');
                detail.className = 'dialog-detail';
                detail.textContent = config.detail;
                content.appendChild(detail);
            }
            
            // Buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'dialog-buttons';
            
            config.buttons.forEach((buttonText, index) => {
                const button = document.createElement('button');
                button.className = 'dialog-button';
                button.textContent = buttonText;
                
                // Apply button styling
                if (index === config.defaultId) {
                    button.classList.add('primary');
                }
                if (config.type === 'error' && buttonText.toLowerCase().includes('delete')) {
                    button.classList.add('danger');
                }
                
                button.addEventListener('click', () => {
                    this.closeDialog(dialogId);
                    resolve(index);
                });
                
                buttonContainer.appendChild(button);
            });
            
            content.appendChild(buttonContainer);
            
            // Assemble dialog
            dialogBox.appendChild(header);
            dialogBox.appendChild(content);
            overlay.appendChild(dialogBox);
            
            // Event handlers
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && config.cancelId >= 0) {
                    this.closeDialog(dialogId);
                    resolve(config.cancelId);
                }
            });
            
            // Keyboard handling
            const keyHandler = (e) => {
                if (e.key === 'Escape' && config.cancelId >= 0) {
                    this.closeDialog(dialogId);
                    resolve(config.cancelId);
                } else if (e.key === 'Enter') {
                    this.closeDialog(dialogId);
                    resolve(config.defaultId);
                }
            };
            
            document.addEventListener('keydown', keyHandler);
            
            // Store references
            this.activeDialogs.set(dialogId, {
                overlay,
                keyHandler,
                resolve
            });
            
            // Show dialog
            document.body.appendChild(overlay);
            
            // Animate in
            requestAnimationFrame(() => {
                overlay.classList.add('show');
            });
            
            // Focus first button
            setTimeout(() => {
                const firstButton = buttonContainer.querySelector('.dialog-button');
                if (firstButton) firstButton.focus();
            }, 100);
        });
    }

    async showErrorBox(title, content) {
        return this.showMessageBox({
            type: 'error',
            title,
            message: content,
            buttons: ['OK']
        });
    }

    async showConfirmBox(message, detail = '') {
        const result = await this.showMessageBox({
            type: 'question',
            title: 'Confirm',
            message,
            detail,
            buttons: ['Cancel', 'OK'],
            defaultId: 1,
            cancelId: 0
        });
        return result === 1;
    }

    async showInput(title, message, defaultValue = '') {
        return new Promise((resolve) => {
            const dialogId = ++this.dialogCounter;
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';
            
            // Create dialog box
            const dialogBox = document.createElement('div');
            dialogBox.className = 'dialog-box';
            
            // Header
            const header = document.createElement('div');
            header.className = 'dialog-header';
            header.textContent = title;
            
            // Content
            const content = document.createElement('div');
            content.className = 'dialog-content';
            
            // Message
            const messageEl = document.createElement('div');
            messageEl.className = 'dialog-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
            
            // Input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                margin: 16px 0;
                border: 1px solid #555;
                border-radius: 4px;
                background: #333;
                color: #fff;
                font-size: 14px;
                font-family: system-ui, -apple-system, sans-serif;
            `;
            content.appendChild(input);
            
            // Buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'dialog-buttons';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'dialog-button';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                this.closeDialog(dialogId);
                resolve(null);
            });
            
            const okBtn = document.createElement('button');
            okBtn.className = 'dialog-button primary';
            okBtn.textContent = 'OK';
            okBtn.addEventListener('click', () => {
                this.closeDialog(dialogId);
                resolve(input.value);
            });
            
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);
            content.appendChild(buttonContainer);
            
            // Assemble dialog
            dialogBox.appendChild(header);
            dialogBox.appendChild(content);
            overlay.appendChild(dialogBox);
            
            // Event handlers
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.closeDialog(dialogId);
                    resolve(input.value);
                } else if (e.key === 'Escape') {
                    this.closeDialog(dialogId);
                    resolve(null);
                }
            });
            
            // Store references
            this.activeDialogs.set(dialogId, {
                overlay,
                keyHandler: null,
                resolve
            });
            
            // Show dialog
            document.body.appendChild(overlay);
            
            // Animate in and focus input
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                input.focus();
                input.select();
            });
        });
    }

    async showProgress(title, message, cancellable = false) {
        return new Promise((resolve) => {
            const dialogId = ++this.dialogCounter;
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';
            
            // Create dialog box
            const dialogBox = document.createElement('div');
            dialogBox.className = 'dialog-box';
            
            // Header
            const header = document.createElement('div');
            header.className = 'dialog-header';
            header.textContent = title;
            
            // Content
            const content = document.createElement('div');
            content.className = 'dialog-content';
            
            // Message
            const messageEl = document.createElement('div');
            messageEl.className = 'dialog-message';
            messageEl.textContent = message;
            content.appendChild(messageEl);
            
            // Progress bar
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                width: 100%;
                height: 8px;
                background: #555;
                border-radius: 4px;
                margin: 16px 0;
                overflow: hidden;
            `;
            
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                height: 100%;
                background: #0066cc;
                width: 0%;
                transition: width 0.3s ease;
            `;
            
            progressContainer.appendChild(progressBar);
            content.appendChild(progressContainer);
            
            // Cancel button (if cancellable)
            if (cancellable) {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'dialog-buttons';
                
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'dialog-button';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.addEventListener('click', () => {
                    this.closeDialog(dialogId);
                    resolve({ cancelled: true });
                });
                
                buttonContainer.appendChild(cancelBtn);
                content.appendChild(buttonContainer);
            }
            
            // Assemble dialog
            dialogBox.appendChild(header);
            dialogBox.appendChild(content);
            overlay.appendChild(dialogBox);
            
            // Store references
            this.activeDialogs.set(dialogId, {
                overlay,
                progressBar,
                messageEl,
                resolve
            });
            
            // Show dialog
            document.body.appendChild(overlay);
            overlay.classList.add('show');
            
            // Return progress control object
            resolve({
                setProgress: (percent) => {
                    progressBar.style.width = Math.max(0, Math.min(100, percent)) + '%';
                },
                setMessage: (msg) => {
                    messageEl.textContent = msg;
                },
                close: () => {
                    this.closeDialog(dialogId);
                }
            });
        });
    }

    closeDialog(dialogId) {
        const dialog = this.activeDialogs.get(dialogId);
        if (!dialog) return;
        
        // Remove event handlers
        if (dialog.keyHandler) {
            document.removeEventListener('keydown', dialog.keyHandler);
        }
        
        // Animate out
        dialog.overlay.classList.remove('show');
        
        setTimeout(() => {
            if (dialog.overlay.parentNode) {
                dialog.overlay.parentNode.removeChild(dialog.overlay);
            }
            this.activeDialogs.delete(dialogId);
        }, 200);
    }

    closeAllDialogs() {
        const dialogIds = Array.from(this.activeDialogs.keys());
        dialogIds.forEach(id => this.closeDialog(id));
    }
}

// Global instance
const dialogSystem = new WebDialogSystem();

// Bridge API for compatibility
export function msg_box(message, detail, opts = {}) {
    return dialogSystem.showMessageBox({
        type: opts.type || 'info',
        title: opts.title || 'MoebiusXBIN',
        message,
        detail,
        buttons: opts.buttons || ['OK'],
        defaultId: opts.defaultId || 0,
        cancelId: opts.cancelId
    });
}

export function error_box(title, content) {
    return dialogSystem.showErrorBox(title, content);
}

export function confirm_box(message, detail) {
    return dialogSystem.showConfirmBox(message, detail);
}

export function input_box(title, message, defaultValue) {
    return dialogSystem.showInput(title, message, defaultValue);
}

export function progress_box(title, message, cancellable) {
    return dialogSystem.showProgress(title, message, cancellable);
}

export { dialogSystem, WebDialogSystem };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- CSS animations and transitions
- DOM event handling
- Promise-based async patterns

**⚠️ Considerations:**
- Custom styling may not match OS theme
- No system notification integration
- Requires manual accessibility implementation

**🚫 Limitations:**
- Cannot interact with other applications
- No system-level modal behavior
- Limited to browser viewport

---