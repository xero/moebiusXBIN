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