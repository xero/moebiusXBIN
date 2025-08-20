# Electron to Web Migration Feature Map
## MoebiusXBIN - Prioritized Refactoring Guide

### Executive Summary

Based on the comprehensive dependency analysis, this document provides an actionable migration map for converting MoebiusXBIN from Electron to a web application. Each feature/module is categorized by complexity and migration priority, with specific implementation strategies for web compatibility.

**Total Migration Items: 12 core areas**  
**High Complexity: 5 areas (8-10 weeks)**  
**Medium Complexity: 4 areas (4-6 weeks)**  
**Low Complexity: 3 areas (2-3 weeks)**

---

## Migration Priority Matrix

### 🔴 **PHASE 1: CRITICAL FOUNDATION** (Weeks 1-4)

#### 1. Inter-Process Communication (IPC) System
**Files Affected:** 35+ files with IPC usage  
**Complexity Rating:** **HIGH**  
**Effort Estimate:** 3-4 weeks  

**Current Mechanism:**
```javascript
// Main Process (app/moebius.js)
electron.ipcMain.on("open_font_browser", async (event, { id }) => {
    // Handle request
});

// Renderer Process (app/senders.js)  
electron.ipcRenderer.send("open_font_browser", {id: windowId});
electron.ipcRenderer.sendSync("get_sauce_info", {id, title, author});
```

**Web Replacement Strategy:**
```javascript
// Event-driven architecture with centralized event bus
import { EventEmitter } from 'events';

class AppEventBus extends EventEmitter {
    send(channel, data) {
        this.emit(channel, data);
    }
    
    sendSync(channel, data) {
        // Convert to Promise-based async pattern
        return new Promise((resolve) => {
            this.emit(channel, data, resolve);
        });
    }
}

// Usage:
const eventBus = new AppEventBus();
eventBus.send('open_font_browser', {id: documentId});
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Not required - native JavaScript  
**Migration Priority:** 🔴 **CRITICAL** - Blocks other migrations

---

#### 2. File System Operations
**Files Affected:** `app/prefs.js`, `app/controller.js`, `app/hourly_saver.js`, `app/moebius.js`  
**Complexity Rating:** **HIGH**  
**Effort Estimate:** 2-3 weeks  

**Current Mechanism:**
```javascript
// Direct filesystem access (app/prefs.js)
const fs = require('fs');
const path = require('path');

function save_prefs() {
    fs.writeFileSync(prefs_file, JSON.stringify(settings, null, 4));
}

function load_prefs() {
    if (fs.existsSync(prefs_file)) {
        return JSON.parse(fs.readFileSync(prefs_file, 'utf8'));
    }
}

// File dialogs (app/senders.js)
function open_box(opts) {
    return electron.remote.dialog.showOpenDialogSync(win, opts);
}
```

**Web Replacement Strategy:**
```javascript
// File System Access API + IndexedDB fallback
class WebFileSystem {
    // Preferences storage
    async savePreferences(prefs) {
        try {
            localStorage.setItem('moebius_prefs', JSON.stringify(prefs));
            // Also backup to IndexedDB for larger data
            await this.saveToIndexedDB('preferences', prefs);
        } catch (error) {
            console.warn('Preference save failed:', error);
        }
    }
    
    loadPreferences() {
        try {
            const stored = localStorage.getItem('moebius_prefs');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return this.loadFromIndexedDB('preferences');
        }
    }
    
    // File operations
    async openFile() {
        if ('showOpenFilePicker' in window) {
            // File System Access API (Chrome 86+)
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'ASCII Art Files',
                    accept: {
                        'text/plain': ['.ans', '.xb', '.bin', '.diz', '.asc', '.nfo']
                    }
                }]
            });
            return await fileHandle.getFile();
        } else {
            // Fallback for other browsers
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.ans,.xb,.bin,.diz,.asc,.nfo';
                input.onchange = (e) => resolve(e.target.files[0]);
                input.click();
            });
        }
    }
    
    async saveFile(data, filename) {
        if ('showSaveFilePicker' in window) {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename
            });
            const writable = await fileHandle.createWritable();
            await writable.write(data);
            await writable.close();
        } else {
            // Download fallback
            const blob = new Blob([data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
}
```

**Browser Compatibility:**  
- ✅ **Chrome 86+**: Full File System Access API  
- ⚠️ **Firefox/Safari**: Input/download fallback  
- ✅ **Mobile**: File picker support  

**Fallback Strategy:** HTML file input + download for unsupported browsers  
**Migration Priority:** 🔴 **CRITICAL** - Core functionality

---

### 🟡 **PHASE 2: ARCHITECTURE TRANSFORMATION** (Weeks 5-8)

#### 3. Multi-Window Management
**Files Affected:** `app/window.js`, `app/moebius.js`, all modal components  
**Complexity Rating:** **HIGH**  
**Effort Estimate:** 3-4 weeks  

**Current Mechanism:**
```javascript
// Multiple BrowserWindow instances (app/window.js)
async function new_win(file, options) {
    const win = new electron.BrowserWindow({
        width: 1280, height: 800,
        webPreferences: { nodeIntegration: true }
    });
    win.loadFile(file);
    return win;
}

// Document management (app/moebius.js)
const docs = {};
docs[win.id] = {
    win: win,
    file: null,
    modal: null,
    edited: false
};
```

**Web Replacement Strategy:**
```javascript
// Single-page application with virtual window system
class WebWindowManager {
    constructor() {
        this.windows = new Map();
        this.activeWindow = null;
        this.windowContainer = document.getElementById('window-container');
    }
    
    createWindow(id, type, options = {}) {
        const windowElement = document.createElement('div');
        windowElement.className = `window window-${type}`;
        windowElement.id = `window-${id}`;
        
        // Apply window styling and positioning
        Object.assign(windowElement.style, {
            position: 'absolute',
            width: options.width + 'px',
            height: options.height + 'px',
            backgroundColor: options.backgroundColor || '#292c33',
            border: '1px solid #444',
            borderRadius: '8px',
            overflow: 'hidden'
        });
        
        this.windowContainer.appendChild(windowElement);
        
        const windowData = {
            id,
            element: windowElement,
            type,
            options,
            isModal: options.modal || false
        };
        
        this.windows.set(id, windowData);
        this.focusWindow(id);
        
        return windowData;
    }
    
    createModal(id, content, options = {}) {
        // Create overlay for modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
        `;
        
        const modal = this.createWindow(id, 'modal', {...options, modal: true});
        overlay.appendChild(modal.element);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeWindow(id);
        });
        
        return modal;
    }
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Not required - DOM-based implementation  
**Migration Priority:** 🟡 **HIGH** - Major UX change

---

#### 4. Native Dialog System
**Files Affected:** `app/senders.js`, all components using dialogs  
**Complexity Rating:** **MEDIUM**  
**Effort Estimate:** 2-3 weeks  

**Current Mechanism:**
```javascript
// Native OS dialogs (app/senders.js)
function msg_box(message, detail, opts = {}) {
    return electron.remote.dialog.showMessageBoxSync(win, {
        message, detail, ...opts
    });
}

function save_box(default_file, ext, opts) {
    return electron.remote.dialog.showSaveDialogSync(win, {
        defaultPath: `${default_file}.${ext}`,
        ...opts
    });
}
```

**Web Replacement Strategy:**
```javascript
// Custom web-based dialog system
class WebDialogSystem {
    showMessageBox(options) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'message-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h3>${options.message}</h3>
                    <p>${options.detail || ''}</p>
                    <div class="dialog-buttons">
                        ${options.buttons?.map((btn, i) => 
                            `<button data-index="${i}">${btn}</button>`
                        ).join('') || '<button data-index="0">OK</button>'}
                    </div>
                </div>
            `;
            
            dialog.addEventListener('click', (e) => {
                if (e.target.dataset.index !== undefined) {
                    const index = parseInt(e.target.dataset.index);
                    document.body.removeChild(dialog);
                    resolve(index);
                }
            });
            
            document.body.appendChild(dialog);
        });
    }
    
    showConfirmDialog(message, detail = '') {
        return this.showMessageBox({
            message,
            detail,
            buttons: ['Cancel', 'OK']
        }).then(result => result === 1);
    }
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Native `confirm()` and `alert()` as last resort  
**Migration Priority:** 🟡 **HIGH** - User experience critical

---

### 🟢 **PHASE 3: PLATFORM INTEGRATION** (Weeks 9-12)

#### 5. Native Menu System
**Files Affected:** `app/menu.js`, `app/touchbar.js`  
**Complexity Rating:** **MEDIUM**  
**Effort Estimate:** 2-3 weeks  

**Current Mechanism:**
```javascript
// Native application menu (app/menu.js)
const menu = electron.Menu.buildFromTemplate([
    {
        label: "File",
        submenu: [
            { label: "New", accelerator: "Cmd+N", click: newDocument },
            { label: "Open", accelerator: "Cmd+O", click: openFile },
            { type: "separator" },
            { label: "Save", accelerator: "Cmd+S", click: saveFile }
        ]
    }
]);
electron.Menu.setApplicationMenu(menu);

// macOS TouchBar (app/touchbar.js) - Platform specific
const { TouchBar } = require('electron');
```

**Web Replacement Strategy:**
```javascript
// Web-based menu system with keyboard shortcuts
class WebMenuSystem {
    constructor() {
        this.shortcuts = new Map();
        this.setupKeyboardHandlers();
    }
    
    createMenuBar(menuTemplate) {
        const menuBar = document.createElement('div');
        menuBar.className = 'menu-bar';
        
        menuTemplate.forEach(item => {
            const menuItem = this.createMenuItem(item);
            menuBar.appendChild(menuItem);
        });
        
        return menuBar;
    }
    
    createMenuItem(item) {
        const menuElement = document.createElement('div');
        menuElement.className = 'menu-item';
        menuElement.textContent = item.label;
        
        if (item.accelerator) {
            this.registerShortcut(item.accelerator, item.click);
            menuElement.title = `${item.label} (${item.accelerator})`;
        }
        
        if (item.submenu) {
            const submenu = this.createSubmenu(item.submenu);
            menuElement.appendChild(submenu);
        }
        
        menuElement.addEventListener('click', item.click || (() => {}));
        return menuElement;
    }
    
    registerShortcut(accelerator, callback) {
        // Convert Electron accelerator format to web
        const webKey = this.convertAccelerator(accelerator);
        this.shortcuts.set(webKey, callback);
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
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Basic keyboard events for unsupported shortcuts  
**Migration Priority:** 🟢 **MEDIUM** - UX enhancement

---

#### 6. Font Management System
**Files Affected:** `app/font_registry.js`, `app/libtextmode/font.js`  
**Complexity Rating:** **MEDIUM**  
**Effort Estimate:** 2 weeks  

**Current Mechanism:**
```javascript
// File system font loading (app/libtextmode/font.js)
const fs = require('fs');

function load_font(file_path) {
    const buffer = fs.readFileSync(file_path);
    return parse_font_data(buffer);
}
```

**Web Replacement Strategy:**
```javascript
// Web-compatible font loading
class WebFontManager {
    constructor() {
        this.loadedFonts = new Map();
        this.fontCache = new Map();
    }
    
    async loadFont(url) {
        if (this.fontCache.has(url)) {
            return this.fontCache.get(url);
        }
        
        try {
            // Fetch font data
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const fontData = this.parseFontData(arrayBuffer);
            
            // Create web font face
            const fontFace = new FontFace(
                fontData.name,
                arrayBuffer,
                { style: 'normal', weight: 'normal' }
            );
            
            await fontFace.load();
            document.fonts.add(fontFace);
            
            this.fontCache.set(url, fontData);
            return fontData;
            
        } catch (error) {
            console.error('Font loading failed:', error);
            return this.getFallbackFont();
        }
    }
    
    async loadFontFromFile(file) {
        // For File System Access API or file input
        const arrayBuffer = await file.arrayBuffer();
        const fontData = this.parseFontData(arrayBuffer);
        
        const fontFace = new FontFace(
            fontData.name,
            arrayBuffer
        );
        
        await fontFace.load();
        document.fonts.add(fontFace);
        
        return fontData;
    }
}
```

**Browser Compatibility:** ✅ Modern browsers (FontFace API)  
**Fallback Strategy:** Canvas-based font rendering for legacy browsers  
**Migration Priority:** 🟢 **MEDIUM** - Core functionality

---

#### 7. Platform Detection & Adaptation
**Files Affected:** Multiple files using `process.platform`  
**Complexity Rating:** **LOW**  
**Effort Estimate:** 1 week  

**Current Mechanism:**
```javascript
// Platform detection (multiple files)
const darwin = (process.platform === "darwin");
const linux = (process.platform === "linux");

if (darwin) {
    // macOS-specific code
    electron.Menu.setApplicationMenu(menu);
}
```

**Web Replacement Strategy:**
```javascript
// Web platform detection
class WebPlatformDetector {
    static get platform() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('mac')) return 'darwin';
        if (userAgent.includes('linux')) return 'linux';
        if (userAgent.includes('win')) return 'win32';
        return 'unknown';
    }
    
    static get isMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent);
    }
    
    static get isTouch() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
}

// Usage
const platform = WebPlatformDetector.platform;
if (platform === 'darwin') {
    // Web equivalent of macOS behavior
    this.setupMacOSKeyboardShortcuts();
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Default behavior for unknown platforms  
**Migration Priority:** 🟢 **LOW** - Enhancement

---

### 🔵 **PHASE 4: ENHANCED WEB FEATURES** (Weeks 13-16)

#### 8. Progressive Web App (PWA) Implementation
**Files Affected:** New service worker, manifest  
**Complexity Rating:** **MEDIUM**  
**Effort Estimate:** 2 weeks  

**Current Mechanism:**
```javascript
// None - Electron provides native app experience
```

**Web Replacement Strategy:**
```javascript
// Service Worker for offline capabilities
// sw.js
const CACHE_NAME = 'moebius-v1';
const STATIC_CACHE = [
    '/',
    '/app/css/moebius.css',
    '/app/fonts/',
    '/app/img/'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.destination === 'font') {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});

// Web App Manifest
// manifest.json
{
    "name": "MoebiusXBIN",
    "short_name": "Moebius",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#292c33",
    "theme_color": "#292c33",
    "file_handlers": [{
        "action": "/",
        "accept": {
            "text/plain": [".ans", ".bin", ".xb", ".diz", ".nfo"]
        }
    }]
}
```

**Browser Compatibility:** ✅ Modern browsers  
**Fallback Strategy:** Regular web app for unsupported browsers  
**Migration Priority:** 🔵 **ENHANCEMENT** - Better UX

---

#### 9. Collaboration & Networking
**Files Affected:** `app/server.js`, WebSocket components  
**Complexity Rating:** **LOW**  
**Effort Estimate:** 1 week  

**Current Mechanism:**
```javascript
// Already web-compatible - WebSocket based
// app/server.js uses Express.js and ws
```

**Web Replacement Strategy:**
```javascript
// Enhanced for pure web environment
class WebCollaborationClient {
    constructor(serverUrl) {
        this.ws = new WebSocket(serverUrl);
        this.setupHandlers();
    }
    
    setupHandlers() {
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };
    }
    
    sendDrawOperation(operation) {
        this.ws.send(JSON.stringify({
            type: 'draw_operation',
            operation
        }));
    }
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Not required - already web-compatible  
**Migration Priority:** 🔵 **LOW** - Already implemented

---

#### 10. Drag & Drop File Handling
**Files Affected:** `app/document/input/drag_and_drop.js`  
**Complexity Rating:** **LOW**  
**Effort Estimate:** 1 week  

**Current Mechanism:**
```javascript
// File system path handling
const path = require('path');

function handle_drop(event) {
    const files = event.dataTransfer.files;
    for (const file of files) {
        const ext = path.extname(file.path);
        // Process file
    }
}
```

**Web Replacement Strategy:**
```javascript
// Web-native drag and drop
class WebDragDropHandler {
    setupDropZone(element) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            
            for (const file of files) {
                const ext = this.getFileExtension(file.name);
                if (this.isSupportedExtension(ext)) {
                    await this.processFile(file);
                }
            }
        });
    }
    
    getFileExtension(filename) {
        return filename.slice(filename.lastIndexOf('.'));
    }
    
    async processFile(file) {
        const content = await file.text();
        // Process file content
    }
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** Not required - Web File API is well supported  
**Migration Priority:** 🔵 **LOW** - Minor enhancement

---

#### 11. Shell Integration Replacements
**Files Affected:** Multiple files using `electron.shell`  
**Complexity Rating:** **LOW**  
**Effort Estimate:** 1 week  

**Current Mechanism:**
```javascript
// OS shell integration
electron.shell.openExternal('https://github.com/blocktronics/moebius');
electron.shell.showItemInFolder(filePath);
```

**Web Replacement Strategy:**
```javascript
// Web-compatible shell operations
class WebShellReplacement {
    openExternal(url) {
        // Open in new tab/window
        window.open(url, '_blank', 'noopener,noreferrer');
    }
    
    showItemInFolder(filePath) {
        // Limited web capability - show notification instead
        this.showNotification(`File location: ${filePath}`, {
            action: 'Copy Path',
            callback: () => navigator.clipboard.writeText(filePath)
        });
    }
    
    showNotification(message, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(message);
        } else {
            // Fallback to in-app notification
            this.showInAppNotification(message, options);
        }
    }
}
```

**Browser Compatibility:** ✅ Universal  
**Fallback Strategy:** In-app notifications for restricted operations  
**Migration Priority:** 🔵 **LOW** - Feature adaptation

---

#### 12. Backup & Auto-save System
**Files Affected:** `app/hourly_saver.js`  
**Complexity Rating:** **LOW**  
**Effort Estimate:** 1 week  

**Current Mechanism:**
```javascript
// File system backup (app/hourly_saver.js)
const fs = require('fs');

function save_backup() {
    const backup_data = serialize_document();
    fs.writeFileSync(backup_path, backup_data);
}
```

**Web Replacement Strategy:**
```javascript
// IndexedDB-based backup system
class WebBackupSystem {
    constructor() {
        this.dbName = 'MoebiusBackups';
        this.storeName = 'backups';
        this.initDB();
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const store = db.createObjectStore(this.storeName, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('timestamp', 'timestamp');
            };
        });
    }
    
    async saveBackup(documentData) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const backup = {
            data: documentData,
            timestamp: Date.now(),
            documentId: documentData.id
        };
        
        await store.add(backup);
        
        // Cleanup old backups (keep last 10)
        await this.cleanupOldBackups();
    }
    
    async restoreBackup(backupId) {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(backupId);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
```

**Browser Compatibility:** ✅ Universal (IndexedDB)  
**Fallback Strategy:** localStorage for smaller backups  
**Migration Priority:** 🔵 **LOW** - Data persistence

---

## Implementation Timeline & Dependencies

### Migration Dependencies Graph
```
Phase 1 (Critical Foundation)
├── IPC System [BLOCKS: All other phases]
└── File System [BLOCKS: All file operations]

Phase 2 (Architecture)  
├── Window Management [DEPENDS: IPC System]
└── Dialog System [DEPENDS: IPC System, File System]

Phase 3 (Platform Integration)
├── Menu System [DEPENDS: IPC System]
├── Font Management [DEPENDS: File System]
└── Platform Detection [INDEPENDENT]

Phase 4 (Enhanced Web Features)
├── PWA Implementation [DEPENDS: All previous phases]
├── Collaboration [INDEPENDENT]
├── Drag & Drop [DEPENDS: File System]
├── Shell Integration [INDEPENDENT]
└── Backup System [DEPENDS: File System]
```

### Risk Assessment Summary

**HIGH RISK:**
- Browser compatibility for File System Access API (Chrome-only)
- Performance impact of DOM-based window management
- User workflow changes from native to web patterns

**MEDIUM RISK:**
- Feature parity between Electron and web versions
- Mobile device compatibility and touch interface
- Offline functionality limitations

**LOW RISK:**
- Core editing functionality (already renderer-process based)
- Visual appearance and styling consistency
- Development tooling and build processes

---

## Recommended Migration Strategy

### 1. **Incremental Approach** (Recommended)
- Maintain Electron version during migration
- Build web version in parallel
- Share core editing logic between versions
- Gradual feature parity achievement

### 2. **Big Bang Approach** (Higher Risk)
- Complete migration before release
- Requires extensive testing phase
- Higher risk but cleaner architecture

### 3. **Hybrid Approach** (Long-term)
- Maintain both Electron and web versions
- Use Electron for power users
- Use web version for broader accessibility

---

## Next Steps

1. **Week 1-2:** Create proof-of-concept with IPC replacement
2. **Week 3-4:** Implement File System Access API with fallbacks
3. **Week 5-8:** Build single-page application architecture
4. **Week 9-12:** Add platform integration and PWA features
5. **Week 13-16:** Testing, optimization, and deployment

This migration map provides a clear roadmap for converting MoebiusXBIN from Electron to a modern web application while maintaining feature parity and ensuring broad browser compatibility.