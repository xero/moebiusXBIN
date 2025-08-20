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

### 6. Native Menu System Migration

**Complexity:** MEDIUM | **Priority:** MEDIUM | **Effort:** 2-3 weeks

#### Current Electron Pattern

```javascript
// Application Menu (app/menu.js)
const electron = require("electron");

const template = [
    {
        label: "File",
        submenu: [
            { 
                label: "New", 
                accelerator: "CmdOrCtrl+N", 
                click: (item, focusedWindow) => create_window() 
            },
            { 
                label: "Open", 
                accelerator: "CmdOrCtrl+O", 
                click: (item, focusedWindow) => open_file() 
            },
            { type: "separator" },
            { 
                label: "Save", 
                accelerator: "CmdOrCtrl+S", 
                click: (item, focusedWindow) => save_file() 
            },
            { 
                label: "Save As...", 
                accelerator: "CmdOrCtrl+Shift+S", 
                click: (item, focusedWindow) => save_as() 
            }
        ]
    },
    {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" }
        ]
    }
];

const menu = electron.Menu.buildFromTemplate(template);
electron.Menu.setApplicationMenu(menu);

// Context Menus
function show_context_menu(x, y, items) {
    const contextMenu = electron.Menu.buildFromTemplate(items);
    contextMenu.popup({ x, y });
}

// TouchBar (macOS)
const { TouchBar } = require('electron');
const { TouchBarButton, TouchBarSpacer } = TouchBar;

const touchBar = new TouchBar({
    items: [
        new TouchBarButton({
            label: 'New',
            backgroundColor: '#7851A9',
            click: () => create_window()
        }),
        new TouchBarSpacer({ size: 'small' }),
        new TouchBarButton({
            label: 'Open',
            backgroundColor: '#7851A9',
            click: () => open_file()
        })
    ]
});
```

#### Web/PWA Pattern

```javascript
// Web Menu System (web-menu-system.js)
class WebMenuSystem {
    constructor() {
        this.shortcuts = new Map();
        this.contextMenus = new Map();
        this.menuBar = null;
        this.activeSubmenu = null;
        this.setupKeyboardHandlers();
        this.setupStyles();
    }

    setupStyles() {
        if (document.getElementById('menu-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'menu-styles';
        styles.textContent = `
            .web-menu-bar {
                background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
                border-bottom: 1px solid #ccc;
                display: flex;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
                user-select: none;
                position: relative;
                z-index: 1000;
            }
            
            .web-menu-item {
                padding: 6px 12px;
                cursor: pointer;
                position: relative;
                color: #333;
            }
            
            .web-menu-item:hover,
            .web-menu-item.active {
                background: #4a90e2;
                color: white;
            }
            
            .web-submenu {
                position: absolute;
                top: 100%;
                left: 0;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                min-width: 180px;
                z-index: 1001;
                opacity: 0;
                transform: translateY(-8px);
                transition: opacity 0.15s ease, transform 0.15s ease;
                pointer-events: none;
            }
            
            .web-submenu.show {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }
            
            .web-submenu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: #333;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .web-submenu-item:last-child {
                border-bottom: none;
            }
            
            .web-submenu-item:hover {
                background: #4a90e2;
                color: white;
            }
            
            .web-submenu-item.disabled {
                color: #999;
                cursor: not-allowed;
            }
            
            .web-submenu-item.disabled:hover {
                background: transparent;
                color: #999;
            }
            
            .web-submenu-separator {
                height: 1px;
                background: #ddd;
                margin: 4px 0;
            }
            
            .web-submenu-accelerator {
                font-size: 11px;
                color: #666;
                margin-left: 24px;
            }
            
            .web-submenu-item:hover .web-submenu-accelerator {
                color: rgba(255, 255, 255, 0.8);
            }
            
            .web-context-menu {
                position: fixed;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                min-width: 160px;
                z-index: 2000;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
            }
            
            .web-context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                color: #333;
            }
            
            .web-context-menu-item:hover {
                background: #4a90e2;
                color: white;
            }
            
            .web-context-menu-separator {
                height: 1px;
                background: #ddd;
                margin: 4px 0;
            }
            
            /* Dark theme support */
            @media (prefers-color-scheme: dark) {
                .web-menu-bar {
                    background: linear-gradient(to bottom, #3c3c3c, #2c2c2c);
                    border-bottom-color: #555;
                }
                
                .web-menu-item {
                    color: #e0e0e0;
                }
                
                .web-submenu,
                .web-context-menu {
                    background: #2c2c2c;
                    border-color: #555;
                }
                
                .web-submenu-item,
                .web-context-menu-item {
                    color: #e0e0e0;
                    border-bottom-color: #444;
                }
                
                .web-submenu-separator,
                .web-context-menu-separator {
                    background: #555;
                }
                
                .web-submenu-accelerator {
                    color: #aaa;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    createMenuBar(template) {
        // Remove existing menu bar
        if (this.menuBar) {
            this.menuBar.remove();
        }
        
        // Create menu bar container
        this.menuBar = document.createElement('div');
        this.menuBar.className = 'web-menu-bar';
        
        // Create menu items
        template.forEach(item => {
            const menuItem = this.createMenuItem(item);
            this.menuBar.appendChild(menuItem);
        });
        
        // Insert at top of body
        document.body.insertBefore(this.menuBar, document.body.firstChild);
        
        // Setup click outside handler
        this.setupClickOutsideHandler();
        
        return this.menuBar;
    }

    createMenuItem(item) {
        const menuElement = document.createElement('div');
        menuElement.className = 'web-menu-item';
        menuElement.textContent = item.label;
        
        if (item.submenu) {
            const submenu = this.createSubmenu(item.submenu);
            menuElement.appendChild(submenu);
            
            // Show/hide submenu on hover/click
            menuElement.addEventListener('mouseenter', () => {
                this.showSubmenu(submenu);
            });
            
            menuElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSubmenu(submenu);
            });
        } else if (item.click) {
            menuElement.addEventListener('click', () => {
                this.hideAllSubmenus();
                item.click();
            });
        }
        
        // Register keyboard shortcut
        if (item.accelerator) {
            this.registerShortcut(item.accelerator, item.click);
        }
        
        return menuElement;
    }

    createSubmenu(submenuItems) {
        const submenu = document.createElement('div');
        submenu.className = 'web-submenu';
        
        submenuItems.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'web-submenu-separator';
                submenu.appendChild(separator);
            } else {
                const submenuItem = this.createSubmenuItem(item);
                submenu.appendChild(submenuItem);
            }
        });
        
        return submenu;
    }

    createSubmenuItem(item) {
        const submenuItem = document.createElement('div');
        submenuItem.className = 'web-submenu-item';
        
        if (item.enabled === false) {
            submenuItem.classList.add('disabled');
        }
        
        // Label
        const label = document.createElement('span');
        label.textContent = item.label;
        submenuItem.appendChild(label);
        
        // Accelerator
        if (item.accelerator) {
            const accelerator = document.createElement('span');
            accelerator.className = 'web-submenu-accelerator';
            accelerator.textContent = this.formatAccelerator(item.accelerator);
            submenuItem.appendChild(accelerator);
            
            // Register shortcut
            this.registerShortcut(item.accelerator, item.click);
        }
        
        // Click handler
        if (item.click && item.enabled !== false) {
            submenuItem.addEventListener('click', () => {
                this.hideAllSubmenus();
                item.click();
            });
        }
        
        return submenuItem;
    }

    showSubmenu(submenu) {
        this.hideAllSubmenus();
        this.activeSubmenu = submenu;
        submenu.classList.add('show');
    }

    hideSubmenu(submenu) {
        if (submenu) {
            submenu.classList.remove('show');
        }
    }

    toggleSubmenu(submenu) {
        if (submenu.classList.contains('show')) {
            this.hideSubmenu(submenu);
        } else {
            this.showSubmenu(submenu);
        }
    }

    hideAllSubmenus() {
        const submenus = this.menuBar?.querySelectorAll('.web-submenu') || [];
        submenus.forEach(submenu => {
            submenu.classList.remove('show');
        });
        
        // Remove active state from menu items
        const menuItems = this.menuBar?.querySelectorAll('.web-menu-item') || [];
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        this.activeSubmenu = null;
    }

    setupClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            if (!this.menuBar?.contains(e.target)) {
                this.hideAllSubmenus();
            }
        });
    }

    showContextMenu(x, y, items) {
        // Remove existing context menu
        this.hideContextMenu();
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'web-context-menu';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        
        items.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'web-context-menu-separator';
                contextMenu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'web-context-menu-item';
                
                // Label
                const label = document.createElement('span');
                label.textContent = item.label;
                menuItem.appendChild(label);
                
                // Accelerator
                if (item.accelerator) {
                    const accelerator = document.createElement('span');
                    accelerator.className = 'web-submenu-accelerator';
                    accelerator.textContent = this.formatAccelerator(item.accelerator);
                    menuItem.appendChild(accelerator);
                }
                
                // Click handler
                if (item.click) {
                    menuItem.addEventListener('click', () => {
                        this.hideContextMenu();
                        item.click();
                    });
                }
                
                contextMenu.appendChild(menuItem);
            }
        });
        
        // Position context menu within viewport
        document.body.appendChild(contextMenu);
        
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
        }
        
        this.activeContextMenu = contextMenu;
        
        // Hide on click outside
        const hideHandler = (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideHandler);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideHandler);
        }, 0);
        
        return contextMenu;
    }

    hideContextMenu() {
        if (this.activeContextMenu) {
            this.activeContextMenu.remove();
            this.activeContextMenu = null;
        }
    }

    registerShortcut(accelerator, callback) {
        if (!callback) return;
        
        const normalizedKey = this.normalizeAccelerator(accelerator);
        this.shortcuts.set(normalizedKey, callback);
    }

    normalizeAccelerator(accelerator) {
        // Convert Electron accelerator format to web format
        return accelerator
            .replace(/CmdOrCtrl/g, navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')
            .replace(/Cmd/g, 'Meta')
            .replace(/Alt/g, 'Alt')
            .replace(/Shift/g, 'Shift')
            .replace(/Ctrl/g, 'Control');
    }

    formatAccelerator(accelerator) {
        // Format accelerator for display
        const isMac = navigator.platform.includes('Mac');
        
        return accelerator
            .replace(/CmdOrCtrl/g, isMac ? '⌘' : 'Ctrl')
            .replace(/Cmd/g, '⌘')
            .replace(/Alt/g, isMac ? '⌥' : 'Alt')
            .replace(/Shift/g, isMac ? '⇧' : 'Shift')
            .replace(/Ctrl/g, isMac ? '⌃' : 'Ctrl')
            .replace(/\+/g, '');
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            const key = this.getKeyCombo(e);
            const handler = this.shortcuts.get(key);
            
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
    }

    getKeyCombo(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Control');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        // Add the main key
        if (event.key.length === 1) {
            parts.push(event.key.toUpperCase());
        } else {
            parts.push(event.key);
        }
        
        return parts.join('+');
    }

    // Menu state management
    enableMenuItem(menuPath, enabled = true) {
        const item = this.findMenuItem(menuPath);
        if (item) {
            if (enabled) {
                item.classList.remove('disabled');
            } else {
                item.classList.add('disabled');
            }
        }
    }

    setMenuItemChecked(menuPath, checked = true) {
        const item = this.findMenuItem(menuPath);
        if (item) {
            if (checked) {
                item.classList.add('checked');
                // Add checkmark
                if (!item.querySelector('.checkmark')) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'checkmark';
                    checkmark.textContent = '✓';
                    item.insertBefore(checkmark, item.firstChild);
                }
            } else {
                item.classList.remove('checked');
                const checkmark = item.querySelector('.checkmark');
                if (checkmark) {
                    checkmark.remove();
                }
            }
        }
    }

    findMenuItem(path) {
        // Find menu item by path (e.g., "File.Save As...")
        const parts = path.split('.');
        let current = this.menuBar;
        
        for (const part of parts) {
            const item = Array.from(current.children).find(child => 
                child.textContent.includes(part)
            );
            if (!item) return null;
            
            if (parts.indexOf(part) === parts.length - 1) {
                return item;
            }
            
            current = item.querySelector('.web-submenu');
            if (!current) return null;
        }
        
        return null;
    }
}

// Global instance
const menuSystem = new WebMenuSystem();

// Bridge API for compatibility
export function createMenuBar(template) {
    return menuSystem.createMenuBar(template);
}

export function showContextMenu(x, y, items) {
    return menuSystem.showContextMenu(x, y, items);
}

export function enableMenuItem(path, enabled) {
    return menuSystem.enableMenuItem(path, enabled);
}

export function setMenuItemChecked(path, checked) {
    return menuSystem.setMenuItemChecked(path, checked);
}

export { menuSystem, WebMenuSystem };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- CSS styling and animations
- Keyboard event handling
- DOM manipulation for menu structure

**⚠️ Considerations:**
- Custom styling doesn't match OS native menus
- Keyboard navigation requires custom implementation
- Mobile devices need touch-friendly menu design

**🚫 Limitations:**
- No integration with OS application menu
- No support for global menu bar (macOS)
- TouchBar simulation not possible

---

### 7. Platform Detection & Adaptation Migration

**Complexity:** LOW | **Priority:** LOW | **Effort:** 1 week

#### Current Electron Pattern

```javascript
// Platform Detection (multiple files)
const darwin = (process.platform === "darwin");
const linux = (process.platform === "linux");
const win32 = (process.platform === "win32");

if (darwin) {
    // macOS-specific code
    electron.Menu.setApplicationMenu(menu);
    // TouchBar support
    win.setTouchBar(touchBar);
} else {
    // Windows/Linux specific code
    win.setMenuBarVisibility(false);
}

// Process info
const arch = process.arch;
const version = process.version;
```

#### Web/PWA Pattern

```javascript
// Web Platform Detection (web-platform-detector.js)
class WebPlatformDetector {
    constructor() {
        this.userAgent = navigator.userAgent.toLowerCase();
        this.platform = navigator.platform.toLowerCase();
        this._detectPlatform();
        this._detectCapabilities();
    }

    _detectPlatform() {
        // Operating System Detection
        if (this.platform.includes('mac') || this.userAgent.includes('mac os')) {
            this._platform = 'darwin';
            this._os = 'macOS';
        } else if (this.platform.includes('win') || this.userAgent.includes('windows')) {
            this._platform = 'win32';
            this._os = 'Windows';
        } else if (this.platform.includes('linux') || this.userAgent.includes('linux')) {
            this._platform = 'linux';
            this._os = 'Linux';
        } else {
            this._platform = 'unknown';
            this._os = 'Unknown';
        }

        // Mobile Detection
        this._isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this._isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
        this._isPhone = this._isMobile && !this._isTablet;

        // Browser Detection
        this._detectBrowser();
    }

    _detectBrowser() {
        if (this.userAgent.includes('chrome') && !this.userAgent.includes('edge')) {
            this._browser = 'chrome';
        } else if (this.userAgent.includes('firefox')) {
            this._browser = 'firefox';
        } else if (this.userAgent.includes('safari') && !this.userAgent.includes('chrome')) {
            this._browser = 'safari';
        } else if (this.userAgent.includes('edge')) {
            this._browser = 'edge';
        } else {
            this._browser = 'unknown';
        }
    }

    _detectCapabilities() {
        // Touch Support
        this._hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // High DPI Support
        this._devicePixelRatio = window.devicePixelRatio || 1;
        this._isHighDPI = this._devicePixelRatio > 1;

        // File API Support
        this._supportsFileAPI = 'File' in window && 'FileReader' in window;
        this._supportsFileSystemAccess = 'showOpenFilePicker' in window;

        // Storage Support
        this._supportsLocalStorage = (() => {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch {
                return false;
            }
        })();

        this._supportsIndexedDB = 'indexedDB' in window;

        // Web API Support
        this._supportsPWA = 'serviceWorker' in navigator;
        this._supportsWebGL = (() => {
            try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch {
                return false;
            }
        })();

        // Keyboard Support
        this._hasPhysicalKeyboard = !this._isMobile || this._isTablet;
    }

    // Public API
    get platform() {
        return this._platform;
    }

    get os() {
        return this._os;
    }

    get browser() {
        return this._browser;
    }

    get isMobile() {
        return this._isMobile;
    }

    get isTablet() {
        return this._isTablet;
    }

    get isPhone() {
        return this._isPhone;
    }

    get isDesktop() {
        return !this._isMobile;
    }

    get hasTouch() {
        return this._hasTouch;
    }

    get isHighDPI() {
        return this._isHighDPI;
    }

    get devicePixelRatio() {
        return this._devicePixelRatio;
    }

    get supportsFileAPI() {
        return this._supportsFileAPI;
    }

    get supportsFileSystemAccess() {
        return this._supportsFileSystemAccess;
    }

    get supportsLocalStorage() {
        return this._supportsLocalStorage;
    }

    get supportsIndexedDB() {
        return this._supportsIndexedDB;
    }

    get supportsPWA() {
        return this._supportsPWA;
    }

    get supportsWebGL() {
        return this._supportsWebGL;
    }

    get hasPhysicalKeyboard() {
        return this._hasPhysicalKeyboard;
    }

    // Convenience Methods
    isDarwin() {
        return this._platform === 'darwin';
    }

    isWindows() {
        return this._platform === 'win32';
    }

    isLinux() {
        return this._platform === 'linux';
    }

    isChrome() {
        return this._browser === 'chrome';
    }

    isFirefox() {
        return this._browser === 'firefox';
    }

    isSafari() {
        return this._browser === 'safari';
    }

    isEdge() {
        return this._browser === 'edge';
    }

    // Feature Detection
    supports(feature) {
        const features = {
            'file-system-access': this._supportsFileSystemAccess,
            'local-storage': this._supportsLocalStorage,
            'indexed-db': this._supportsIndexedDB,
            'service-worker': this._supportsPWA,
            'webgl': this._supportsWebGL,
            'touch': this._hasTouch,
            'high-dpi': this._isHighDPI
        };

        return features[feature] || false;
    }

    // Get appropriate shortcuts for platform
    getShortcutModifier() {
        return this.isDarwin() ? 'Meta' : 'Control';
    }

    getShortcutSymbol() {
        return this.isDarwin() ? '⌘' : 'Ctrl';
    }

    // Get platform-appropriate styles
    getPlatformStyles() {
        const styles = {
            fontFamily: this.isDarwin() ? 
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' :
                '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            scrollbarWidth: this.isDarwin() ? 'auto' : 'thin',
            borderRadius: this.isDarwin() ? '6px' : '4px'
        };

        if (this.isMobile) {
            styles.fontSize = '16px'; // Prevent zoom on mobile
            styles.touchAction = 'manipulation';
        }

        return styles;
    }

    // Responsive breakpoints
    getScreenSize() {
        const width = window.innerWidth;
        
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        if (width < 1440) return 'desktop';
        return 'large';
    }

    // Adapt UI for platform
    adaptUI(element) {
        const styles = this.getPlatformStyles();
        
        Object.assign(element.style, styles);
        
        // Add platform classes
        element.classList.add(`platform-${this._platform}`);
        element.classList.add(`browser-${this._browser}`);
        element.classList.add(`screen-${this.getScreenSize()}`);
        
        if (this._isMobile) element.classList.add('mobile');
        if (this._hasTouch) element.classList.add('touch');
        if (this._isHighDPI) element.classList.add('high-dpi');
    }

    // Performance optimization hints
    getPerformanceHints() {
        return {
            preferCanvas: this._supportsWebGL && this.isDesktop,
            useVirtualization: this._isMobile || this.getScreenSize() === 'mobile',
            enableTransitions: !this._isMobile || this._devicePixelRatio === 1,
            chunkOperations: this._isMobile,
            maxConcurrentOperations: this._isMobile ? 2 : 4
        };
    }
}

// Global instance
const platformDetector = new WebPlatformDetector();

// Bridge API for compatibility
export const darwin = platformDetector.isDarwin();
export const linux = platformDetector.isLinux();
export const win32 = platformDetector.isWindows();

export function getPlatform() {
    return platformDetector.platform;
}

export function getOS() {
    return platformDetector.os;
}

export function isMobile() {
    return platformDetector.isMobile;
}

export function hasTouch() {
    return platformDetector.hasTouch;
}

export function supports(feature) {
    return platformDetector.supports(feature);
}

export { platformDetector, WebPlatformDetector };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- User agent and platform detection
- Screen size and device pixel ratio
- Basic capability detection

**⚠️ Considerations:**
- User agent spoofing can affect detection
- Capabilities may change with browser updates
- Mobile device detection isn't 100% accurate

**🚫 Limitations:**
- No access to detailed system information
- Cannot detect specific hardware features
- Limited compared to native platform APIs

---

### 8. Progressive Web App (PWA) Implementation Migration

**Complexity:** MEDIUM | **Priority:** ENHANCEMENT | **Effort:** 2 weeks

#### Current Electron Pattern

```javascript
// Electron provides native app experience by default
// No specific PWA implementation needed

// Native features available:
// - Desktop installation
// - System integration
// - Offline capability
// - File associations
// - Background processes
```

#### Web/PWA Pattern

```javascript
// Service Worker (sw.js)
const CACHE_NAME = 'moebiusxbin-v1.0.0';
const STATIC_ASSETS = [
    '/',
    '/app/css/moebius.css',
    '/app/js/moebius.js',
    '/app/fonts/IBM_VGA_8x16.f',
    '/app/fonts/IBM_VGA_8x14.f',
    '/app/fonts/IBM_VGA_8x8.f',
    '/app/img/icon-192.png',
    '/app/img/icon-512.png'
];

const DYNAMIC_CACHE = 'moebiusxbin-dynamic-v1';
const FONT_CACHE = 'moebiusxbin-fonts-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== FONT_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.destination === 'font') {
        event.respondWith(handleFontRequest(request));
    } else if (url.pathname.startsWith('/app/')) {
        event.respondWith(handleStaticAsset(request));
    } else if (request.destination === 'document') {
        event.respondWith(handleDocumentRequest(request));
    } else {
        event.respondWith(handleGenericRequest(request));
    }
});

async function handleFontRequest(request) {
    const cache = await caches.open(FONT_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Font fetch failed:', error);
        // Return a fallback font if available
        return cache.match('/app/fonts/IBM_VGA_8x16.f');
    }
}

async function handleStaticAsset(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Serve from cache, update in background
        fetchAndUpdateCache(request, cache);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Static asset fetch failed:', error);
        throw error;
    }
}

async function handleDocumentRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        // Serve cached app shell for offline functionality
        const cache = await caches.open(CACHE_NAME);
        const fallbackResponse = await cache.match('/');
        return fallbackResponse || new Response('Offline', { status: 503 });
    }
}

async function handleGenericRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Generic fetch failed:', error);
        throw error;
    }
}

async function fetchAndUpdateCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Ignore background update failures
    }
}

// Background sync for data persistence
self.addEventListener('sync', (event) => {
    if (event.tag === 'backup-document') {
        event.waitUntil(syncDocumentBackup());
    }
});

async function syncDocumentBackup() {
    // Sync document backups when online
    try {
        const db = await openIndexedDB();
        const pendingBackups = await getPendingBackups(db);
        
        for (const backup of pendingBackups) {
            // Attempt to sync with server or cloud storage
            await syncBackup(backup);
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications for collaboration
self.addEventListener('push', (event) => {
    const options = {
        body: 'New collaboration activity',
        icon: '/app/img/icon-192.png',
        badge: '/app/img/badge.png',
        tag: 'collaboration',
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MoebiusXBIN', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
```

```json
// Web App Manifest (manifest.json)
{
    "name": "MoebiusXBIN",
    "short_name": "Moebius",
    "description": "ASCII/ANSI Art Editor with custom font and color support",
    "start_url": "/",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#292c33",
    "theme_color": "#292c33",
    "categories": ["graphics", "productivity", "utilities"],
    "icons": [
        {
            "src": "/app/img/icon-72.png",
            "sizes": "72x72",
            "type": "image/png"
        },
        {
            "src": "/app/img/icon-96.png",
            "sizes": "96x96",
            "type": "image/png"
        },
        {
            "src": "/app/img/icon-128.png",
            "sizes": "128x128",
            "type": "image/png"
        },
        {
            "src": "/app/img/icon-144.png",
            "sizes": "144x144",
            "type": "image/png"
        },
        {
            "src": "/app/img/icon-152.png",
            "sizes": "152x152",
            "type": "image/png"
        },
        {
            "src": "/app/img/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/app/img/icon-384.png",
            "sizes": "384x384",
            "type": "image/png"
        },
        {
            "src": "/app/img/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ],
    "file_handlers": [
        {
            "action": "/",
            "accept": {
                "text/plain": [".ans", ".bin", ".xb", ".diz", ".nfo", ".asc"]
            }
        }
    ],
    "share_target": {
        "action": "/share",
        "method": "POST",
        "enctype": "multipart/form-data",
        "params": {
            "files": [
                {
                    "name": "file",
                    "accept": [".ans", ".bin", ".xb", ".diz", ".nfo", ".asc"]
                }
            ]
        }
    },
    "shortcuts": [
        {
            "name": "New Document",
            "short_name": "New",
            "description": "Create a new ASCII art document",
            "url": "/?action=new",
            "icons": [
                {
                    "src": "/app/img/shortcut-new.png",
                    "sizes": "96x96"
                }
            ]
        },
        {
            "name": "Open Recent",
            "short_name": "Recent",
            "description": "Open a recently edited document",
            "url": "/?action=recent",
            "icons": [
                {
                    "src": "/app/img/shortcut-recent.png",
                    "sizes": "96x96"
                }
            ]
        }
    ]
}
```

```javascript
// PWA Registration and Management (pwa-manager.js)
class PWAManager {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        this.setupOnlineHandlers();
        this.registerServiceWorker();
        this.setupInstallPrompt();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', this.swRegistration);
                
                // Listen for updates
                this.swRegistration.addEventListener('updatefound', () => {
                    this.handleServiceWorkerUpdate();
                });
                
                // Handle controller change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    handleServiceWorkerUpdate() {
        const newWorker = this.swRegistration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.showUpdateNotification();
            }
        });
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span>A new version is available!</span>
                <button onclick="window.location.reload()">Update</button>
                <button onclick="this.parentElement.parentElement.remove()">Later</button>
            </div>
        `;
        
        document.body.appendChild(notification);
    }

    setupInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton(deferredPrompt);
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallButton();
        });
    }

    showInstallButton(deferredPrompt) {
        const installButton = document.createElement('button');
        installButton.textContent = 'Install App';
        installButton.className = 'install-button';
        installButton.onclick = async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('Install prompt outcome:', outcome);
            
            if (outcome === 'accepted') {
                this.hideInstallButton();
            }
            
            deferredPrompt = null;
        };
        
        document.body.appendChild(installButton);
    }

    hideInstallButton() {
        const installButton = document.querySelector('.install-button');
        if (installButton) {
            installButton.remove();
        }
    }

    setupOnlineHandlers() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnlineStatus();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOnlineStatus();
        });
    }

    handleOnlineStatus() {
        const statusElement = document.getElementById('online-status');
        if (statusElement) {
            statusElement.textContent = this.isOnline ? 'Online' : 'Offline';
            statusElement.className = this.isOnline ? 'online' : 'offline';
        }
        
        if (this.isOnline) {
            // Sync pending data
            this.syncPendingData();
        }
    }

    async syncPendingData() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                await this.swRegistration.sync.register('backup-document');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }

    // File handling for PWA
    async handleFileOpen(files) {
        if (!files || files.length === 0) return;
        
        for (const file of files) {
            try {
                const content = await file.text();
                // Process the file content
                this.openDocument(content, file.name);
            } catch (error) {
                console.error('Failed to read file:', error);
            }
        }
    }

    openDocument(content, filename) {
        // Emit event to application
        window.dispatchEvent(new CustomEvent('moebius:open_document', {
            detail: { content, filename }
        }));
    }

    // Share handling
    async handleShare(shareData) {
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback to clipboard
                await navigator.clipboard.writeText(shareData.text || shareData.url);
                this.showShareFallback();
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    }

    showShareFallback() {
        const notification = document.createElement('div');
        notification.textContent = 'Copied to clipboard!';
        notification.className = 'share-notification';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Notification handling
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    async subscribeToPushNotifications() {
        if (!this.swRegistration) return null;
        
        try {
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            
            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);
            
            return subscription;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return null;
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }

    async sendSubscriptionToServer(subscription) {
        // Send subscription to your server for push notifications
        try {
            await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
        }
    }
}

// Initialize PWA
const pwaManager = new PWAManager();

// Handle file launch
if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
        if (launchParams.files && launchParams.files.length) {
            await pwaManager.handleFileOpen(launchParams.files);
        }
    });
}

export { pwaManager, PWAManager };
```

#### Browser Compatibility & Limitations

**✅ Universal Support:**
- Service Worker: Chrome 40+, Firefox 44+, Safari 11.1+
- Web App Manifest: Chrome 39+, Firefox 53+, Safari 14.1+
- Basic PWA features supported across modern browsers

**⚠️ Limited Support:**
- File handling: Chrome 102+, Edge 102+ (experimental)
- Background sync: Chrome 49+, Edge 79+
- Push notifications: Chrome 42+, Firefox 44+, Safari 16+

**🚫 Limitations:**
- iOS Safari has restrictions on PWA features
- Cannot access all system APIs
- Limited background processing compared to native apps
- File associations limited to newer browsers

**Migration Strategy:**
1. Implement basic service worker for offline functionality
2. Add web app manifest for installation
3. Enhance with advanced PWA features gradually
4. Test thoroughly across target browsers and devices

---

## 📋 MIGRATION SUMMARY & RECOMMENDATIONS

### Implementation Priority Order

1. **Phase 1 (Weeks 1-4): Foundation**
   - IPC System replacement (critical blocker)
   - File System Operations (core functionality)

2. **Phase 2 (Weeks 5-8): Architecture**
   - Multi-Window Management (major UX change)
   - Native Dialog System (user interaction)

3. **Phase 3 (Weeks 9-12): Integration**
   - Font Management System (core feature)
   - Native Menu System (navigation)

4. **Phase 4 (Weeks 13-16): Enhancement**
   - Platform Detection (optimization)
   - PWA Implementation (modern features)

### Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge | Mobile |
|---------|--------|---------|--------|------|--------|
| IPC Replacement | ✅ | ✅ | ✅ | ✅ | ✅ |
| File System Access | ✅ | ⚠️ | ⚠️ | ✅ | ❌ |
| Window Management | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Dialog System | ✅ | ✅ | ✅ | ✅ | ✅ |
| Font Management | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| Menu System | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Platform Detection | ✅ | ✅ | ✅ | ✅ | ✅ |
| PWA Features | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |

**Legend:** ✅ Full Support | ⚠️ Partial/Limited | ❌ No Support

### Key Success Factors

1. **Progressive Enhancement**: Build core functionality first, enhance with advanced features
2. **Graceful Degradation**: Provide fallbacks for unsupported browsers/features
3. **Performance Focus**: Optimize for mobile and lower-powered devices
4. **User Testing**: Validate workflows with actual users throughout migration
5. **Incremental Rollout**: Maintain parallel Electron version during transition

### Risk Mitigation Strategies

- **Browser Compatibility**: Implement comprehensive feature detection and fallbacks
- **Performance**: Use lazy loading, virtualization, and efficient data structures
- **User Experience**: Maintain familiar workflows while adapting to web constraints
- **Data Safety**: Implement robust backup systems and error handling
- **Security**: Validate all user inputs and implement Content Security Policy

This comprehensive migration guide provides detailed implementation patterns for converting MoebiusXBIN from Electron to a modern web application while maintaining feature parity and ensuring broad browser compatibility.