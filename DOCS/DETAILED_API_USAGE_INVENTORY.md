# Detailed Node.js/Electron API Usage Inventory
## MoebiusXBIN - Complete Line-by-Line Analysis

This document provides a comprehensive inventory of every Node.js and Electron API usage in the MoebiusXBIN codebase, with specific line numbers and web-compatible alternatives.

---

## 📋 ELECTRON API USAGE INVENTORY

### 1. `electron.app` - Application Lifecycle

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/moebius.js` | 22 | `electron.app.commandLine.appendSwitch()` | Feature flags for color picker | CSS feature queries | ✅ Full |
| `app/moebius.js` | 474 | `electron.app.on("ready")` | App initialization | `DOMContentLoaded` event | ✅ Full |
| `app/moebius.js` | 485 | `electron.app.on("window-all-closed")` | App quit logic | `beforeunload` event | ⚠️ Partial |
| `app/moebius.js` | 489 | `electron.app.on("activate")` | macOS activate | `focus` event | ⚠️ Partial |
| `app/prefs.js` | 3 | `electron.app.getPath("userData")` | Preferences storage path | IndexedDB/localStorage | ✅ Full |
| `app/moebius.js` | 508 | `electron.app.dock.setMenu()` | macOS dock menu | PWA shortcuts | ⚠️ Limited |

### 2. `electron.BrowserWindow` - Window Management

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/window.js` | 12 | `new electron.BrowserWindow()` | Window creation | DOM-based windows | ✅ Full |
| `app/window.js` | 16-20 | `webPreferences` config | Security settings | Not applicable | ✅ N/A |
| `app/window.js` | 37 | `win.setMenuBarVisibility()` | Hide menu bar | CSS styling | ✅ Full |
| `app/moebius.js` | 34 | `electron.screen.getPrimaryDisplay()` | Screen dimensions | `window.screen` | ✅ Full |
| `app/moebius.js` | 37 | `win.setPosition()` | Window positioning | CSS positioning | ✅ Full |
| `app/moebius.js` | 39 | `win.getPosition()` | Get window position | Element bounds | ✅ Full |

### 3. `electron.ipcMain` - Main Process IPC

| File | Line(s) | API Call | Channel Name | Web Alternative | Feasibility |
|------|---------|----------|--------------|-----------------|-------------|
| `app/moebius.js` | 88 | `electron.ipcMain.on()` | `close_modal` | Custom events | ✅ Full |
| `app/moebius.js` | 91 | `electron.ipcMain.on()` | `open_font_browser` | Custom events | ✅ Full |
| `app/moebius.js` | 108 | `electron.ipcMain.on()` | `open_palette_browser` | Custom events | ✅ Full |
| `app/moebius.js` | 130 | `electron.ipcMain.on()` | `new_document` | Custom events | ✅ Full |
| `app/moebius.js` | 155 | `electron.ipcMain.on()` | `open_document` | Custom events | ✅ Full |
| `app/menu.js` | 686-996 | `electron.ipcMain.on()` | Menu handlers (35+) | Event listeners | ✅ Full |
| `app/touchbar.js` | 133-137 | `electron.ipcMain.on()` | TouchBar handlers | Keyboard shortcuts | ⚠️ Alternative |

### 4. `electron.ipcRenderer` - Renderer Process IPC

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/senders.js` | 6 | `electron.ipcRenderer.on()` | Event listening | Event listeners | ✅ Full |
| `app/senders.js` | 10 | `electron.ipcRenderer.sendSync()` | Sync communication | Async promises | ✅ Full |
| `app/senders.js` | 14 | `electron.ipcRenderer.send()` | Async communication | Custom events | ✅ Full |

### 5. `electron.remote` - Remote Module

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/senders.js` | 3 | `electron.remote.getCurrentWindow()` | Window reference | Global context | ✅ Full |
| `app/senders.js` | 19 | `electron.remote.dialog.showMessageBoxSync()` | Message dialogs | Custom dialogs | ✅ Full |
| `app/senders.js` | 24 | `electron.remote.dialog.showOpenDialogSync()` | File open dialogs | File System Access API | ⚠️ Partial |
| `app/senders.js` | 31 | `electron.remote.dialog.showSaveDialogSync()` | File save dialogs | File System Access API | ⚠️ Partial |

### 6. `electron.shell` - Shell Integration

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/controller.js` | 122 | `electron.shell.openExternal()` | Open URLs | `window.open()` | ✅ Full |
| `app/controller.js` | 127 | `electron.shell.showItemInFolder()` | Reveal file | Download alternative | ❌ None |
| `app/menu.js` | 277-287 | `electron.shell.openExternal()` | Help links | `window.open()` | ✅ Full |
| `app/document/ui/chat.js` | 76 | `electron.shell.openExternal()` | Chat links | `window.open()` | ✅ Full |

### 7. `electron.Menu` - Native Menus

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/menu.js` | Throughout | `electron.Menu.setApplicationMenu()` | Menu bar | HTML/CSS menu | ✅ Full |
| `app/menu.js` | Throughout | `electron.Menu.buildFromTemplate()` | Menu creation | DOM generation | ✅ Full |

### 8. `electron.TouchBar` - macOS TouchBar

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/touchbar.js` | 6-57 | `new electron.TouchBar()` | TouchBar creation | Keyboard shortcuts | ❌ None |
| `app/touchbar.js` | 8-15 | `TouchBar.TouchBarButton` | TouchBar buttons | Hotkeys | ❌ None |

---

## 📋 NODE.JS CORE MODULE USAGE INVENTORY

### 1. `fs` - File System Operations

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/prefs.js` | 53 | `fs.existsSync()` | Check file exists | IndexedDB query | ✅ Full |
| `app/prefs.js` | 55 | `fs.readFileSync()` | Read preferences | localStorage/IndexedDB | ✅ Full |
| `app/prefs.js` | 61 | `fs.writeFileSync()` | Write preferences | localStorage/IndexedDB | ✅ Full |
| `app/controller.js` | 296 | `fs.writeFileSync()` | Save file | File System Access API | ⚠️ Partial |
| `app/controller.js` | 312 | `fs.writeFileSync()` | Export file | Download blob | ✅ Full |
| `app/hourly_saver.js` | 4 | `fs.existsSync()`, `fs.mkdirSync()` | Backup directory | IndexedDB | ✅ Full |

### 2. `path` - Path Operations

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/prefs.js` | 2 | `path.join()` | Path building | String joining | ✅ Full |
| `app/senders.js` | 31 | `path.parse()` | Parse filename | String operations | ✅ Full |
| `app/moebius.js` | 6 | `path` module | Path operations | URL API | ✅ Full |
| `app/document/doc.js` | 5 | `path.extname()` | File extension | String operations | ✅ Full |
| `app/libtextmode/font.js` | 4 | `path.join()` | Font file paths | URL construction | ✅ Full |

### 3. `process` - Process Information

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/window.js` | 2 | `process.platform` | Platform detection | `navigator.platform` | ✅ Full |
| `app/menu.js` | 3 | `process.platform` | Platform detection | `navigator.platform` | ✅ Full |
| `app/moebius.js` | 9-11 | `process.platform` | Platform detection | `navigator.platform` | ✅ Full |
| `app/moebius.js` | 490 | `process.argv` | Command line args | `location.search` | ⚠️ Partial |

### 4. Resource Path Access

| File | Line(s) | API Call | Current Usage | Web Alternative | Feasibility |
|------|---------|----------|---------------|-----------------|-------------|
| `app/windows/cheatsheet.js` | 3 | `process.resourcesPath` | App resources | Bundled assets | ✅ Full |
| `app/windows/controlcharacters.js` | 34 | `process.resourcesPath` | App resources | Bundled assets | ✅ Full |
| `app/windows/splash_screen.js` | 7 | `process.resourcesPath` | App resources | Bundled assets | ✅ Full |

---

## 🎯 PRIORITY MIGRATION MATRIX

### CRITICAL (Must Implement First)

| API Category | Usage Count | Migration Complexity | Business Impact | Recommended Approach |
|--------------|-------------|---------------------|-----------------|-------------------|
| IPC System | 85+ instances | HIGH | CRITICAL | Custom Event Bus |
| File Operations | 15+ instances | HIGH | CRITICAL | File System Access API + Fallbacks |
| Window Management | 20+ instances | HIGH | HIGH | DOM-based Windows |
| Platform Detection | 10+ instances | LOW | MEDIUM | Navigator API |

### HIGH PRIORITY

| API Category | Usage Count | Migration Complexity | Business Impact | Recommended Approach |
|--------------|-------------|---------------------|-----------------|-------------------|
| Dialog System | 8+ instances | MEDIUM | HIGH | Custom Dialog Components |
| Menu System | 50+ instances | MEDIUM | HIGH | HTML/CSS Menu Bar |
| Shell Integration | 5+ instances | LOW | MEDIUM | window.open() + Alternatives |

### MEDIUM PRIORITY

| API Category | Usage Count | Migration Complexity | Business Impact | Recommended Approach |
|--------------|-------------|---------------------|-----------------|-------------------|
| Preferences Storage | 10+ instances | LOW | MEDIUM | localStorage + IndexedDB |
| Resource Loading | 8+ instances | LOW | LOW | Bundled Assets |

### LOW PRIORITY / ACCEPTABLE LOSS

| API Category | Usage Count | Migration Complexity | Business Impact | Recommended Approach |
|--------------|-------------|---------------------|-----------------|-------------------|
| TouchBar | 8+ instances | IMPOSSIBLE | LOW | Remove/Replace with Hotkeys |
| Dock Menu | 1 instance | IMPOSSIBLE | LOW | PWA Shortcuts Alternative |
| File Reveal | 2 instances | IMPOSSIBLE | LOW | Download Alternative |

---

## 🔧 IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (Weeks 1-4)
1. **Event Bus System** - Replace all IPC calls
2. **File System Abstraction** - Handle file operations
3. **Platform Detection** - Replace process.platform
4. **Basic Window Management** - Core UI container

### Phase 2: User Interface (Weeks 5-8)
1. **Dialog System** - Replace native dialogs
2. **Menu System** - HTML/CSS menu bar
3. **Window Management** - Complete window simulation
4. **Responsive Design** - Mobile/tablet adaptation

### Phase 3: Feature Completion (Weeks 9-12)
1. **Preferences Migration** - Data migration tools
2. **Shell Integration** - URL handling alternatives
3. **Resource Management** - Asset bundling
4. **Performance Optimization** - Loading and caching

### Phase 4: Polish & Deployment (Weeks 13-16)
1. **PWA Features** - Service worker, manifest
2. **Cross-browser Testing** - Compatibility validation
3. **Fallback Systems** - Graceful degradation
4. **Documentation** - Migration guides

---

## 📊 BROWSER COMPATIBILITY ASSESSMENT

### File System Access API Support
- **Chrome 86+**: ✅ Full support
- **Edge 86+**: ✅ Full support  
- **Firefox**: ❌ No support (use fallback)
- **Safari 14+**: ⚠️ Limited support

### Fallback Strategies Required
1. **File Operations**: input[type="file"] + download blobs
2. **Storage**: localStorage when IndexedDB unavailable
3. **Events**: setTimeout when no BroadcastChannel
4. **Notifications**: In-page when no Notification API

### Minimum Browser Targets
- **Chrome**: 86+ (for File System Access API)
- **Firefox**: 88+ (with fallbacks)
- **Safari**: 14+ (with fallbacks)
- **Edge**: 86+ (full feature parity)
- **Mobile**: iOS 14+, Android Chrome 86+

---

## 🚨 CRITICAL LIMITATIONS & WORKAROUNDS

### 1. No True Multi-Process Architecture
**Limitation**: Web browsers don't have true process separation like Electron
**Workaround**: Use Web Workers for heavy computation, service workers for background tasks

### 2. Limited File System Access
**Limitation**: Direct file system access only in Chromium browsers
**Workaround**: Comprehensive input/download fallback system

### 3. No Native Menu Bar
**Limitation**: Web apps can't create true native menu bars
**Workaround**: HTML/CSS menu bar with platform-specific styling

### 4. No TouchBar Support
**Limitation**: TouchBar is macOS-specific hardware feature
**Workaround**: Document TouchBar functions and map to keyboard shortcuts

### 5. Limited Shell Integration
**Limitation**: Can't reveal files in folder or deep OS integration
**Workaround**: Provide download links and web-based alternatives

---

This detailed inventory provides the exact locations and migration strategies for every Node.js and Electron API usage in the MoebiusXBIN codebase, enabling a systematic and comprehensive migration to web technologies.