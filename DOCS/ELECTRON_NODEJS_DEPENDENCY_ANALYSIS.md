# Electron and Node.js Dependency Analysis
## MoebiusXBIN - Complete Audit Report

### Executive Summary

**Total Files with Electron Dependencies: 26 files**  
**Total Files with Node.js Dependencies: 15 files**  
**Total IPC Communication Points: 85+ instances**

The codebase is heavily dependent on Electron APIs and Node.js modules, with the most critical dependencies being:
1. **Inter-Process Communication (IPC)** - 85+ handlers across main and renderer processes
2. **File System Operations** - Direct fs/path usage in 10+ files
3. **Native OS Integration** - Window management, dialogs, shell operations
4. **Platform Detection** - process.platform checks throughout

### Existing Web Infrastructure ✅

The application already has partial web compatibility infrastructure:
- **Web Client**: `app/web_client/` directory with web-specific implementations
- **Server Mode**: `server.js` with Express.js web server
- **WebSocket Support**: Real-time collaboration features for web
- **Web Canvas**: `web_canvas.js` - Canvas-based rendering for browsers

---

## Detailed Dependency Breakdown

### 1. Electron API Dependencies

#### 1.1 Main Process (electron.app, BrowserWindow)

**File: `app/moebius.js` (Lines 2, 22, 474-519)**
- **Purpose**: Application lifecycle, window management, command line args
- **Usage**: 
  - `electron.app.commandLine.appendSwitch()` - Feature toggles
  - `electron.app.on("ready")` - App initialization
  - `electron.app.on("window-all-closed")` - App cleanup
  - `electron.app.getPath("userData")` - Preferences storage
  - `electron.app.dock.setMenu()` - macOS dock integration
- **Web Alternative**: ❌ No direct equivalent (lifecycle handled by browser)

**File: `app/window.js` (Lines 1, 12)**
- **Purpose**: Window creation and management
- **Usage**: `new electron.BrowserWindow()` - Creates application windows
- **Web Alternative**: ⚠️ Partial (single window, modals only)

#### 1.2 Inter-Process Communication (IPC)

**Main Process Handlers (`app/moebius.js`): 30+ handlers**
- Lines 88, 91, 108, 130, 155, 167, 206, 214, 235, 242, 249, 259, 261, 270, 276, 282, 286, 298, 310, 320, 332, 339, 351, 358, 362, 372, 376, 385, 392, 404, 416, 430, 440, 444, 454, 459, 466
- **Purpose**: Document operations, file handling, preferences, UI state management
- **Web Alternative**: ✅ EventEmitter pattern (already partially implemented)

**Menu System (`app/menu.js`): 35+ handlers**
- Lines 686, 691, 695, 699, 703, 707, 711, 715, 721, 726, 795, 797, 804, 965-996
- **Purpose**: Menu state synchronization, UI updates
- **Web Alternative**: ✅ DOM events + state management

**TouchBar (`app/touchbar.js`): 5 handlers**
- Lines 133-137
- **Purpose**: macOS Touch Bar integration
- **Web Alternative**: ❌ No equivalent (TouchBar is macOS-specific)

**Renderer Process Senders (`app/senders.js`): All functions**
- Lines 6, 10, 14 - Core IPC communication functions
- **Purpose**: Send commands from renderer to main process
- **Web Alternative**: ✅ WebSocket/fetch API

#### 1.3 Dialog Operations

**File: `app/senders.js` (Lines 19, 24, 31)**
- **Purpose**: File open/save dialogs, message boxes
- **Usage**: `electron.remote.dialog.showMessageBoxSync/showOpenDialogSync/showSaveDialogSync`
- **Web Alternative**: ⚠️ File System Access API (Chrome only) + download fallback

**File: `app/moebius.js` (Lines 141, 170)**
- **Purpose**: File picker dialogs
- **Web Alternative**: ⚠️ File System Access API (Chrome only) + input[type=file] fallback

#### 1.4 Shell Integration

**Files: `app/controller.js` (Lines 122, 127, 175), `app/menu.js` (Lines 277-287), `app/document/ui/chat.js` (Line 76)**
- **Purpose**: Open external URLs, show files in folder
- **Usage**: `electron.shell.openExternal()`, `electron.shell.showItemInFolder()`
- **Web Alternative**: ✅ `window.open()` for URLs, ❌ No folder reveal

### 2. Node.js Module Dependencies

#### 2.1 File System (fs)

**File: `app/prefs.js` (Lines 53, 55, 61)**
- **Purpose**: Preferences storage and retrieval
- **Usage**: `fs.existsSync()`, `fs.readFileSync()`, `fs.writeFileSync()`
- **Web Alternative**: ✅ localStorage/IndexedDB (already planned in migration docs)

**File: `app/controller.js` (Lines 296, 312)**
- **Purpose**: File operations during save/export
- **Web Alternative**: ✅ File System Access API + download fallback

**File: `app/hourly_saver.js` (Line 4)**
- **Purpose**: Automatic backup functionality  
- **Web Alternative**: ✅ IndexedDB for local storage

**File: `app/moebius.js` (Line 112)**
- **Purpose**: Tutorial file loading
- **Web Alternative**: ✅ Fetch API + bundled resources

**Files: `app/libtextmode/font.js` (Line 3), `app/libtextmode/libtextmode.js` (Line 12)**
- **Purpose**: Font file loading and processing
- **Web Alternative**: ✅ Fetch API + WebFont loading

#### 2.2 Path Module

**Files with path usage:**
- `app/document/doc.js` (Line 5) - File path operations
- `app/document/input/drag_and_drop.js` (Line 1) - File extension detection
- `app/server.js` (Line 9) - Server file paths
- `app/hourly_saver.js` (Line 2) - Backup file paths
- `app/prefs.js` (Line 2) - Preferences file path
- `app/senders.js` (Line 2) - Dialog default paths
- `app/moebius.js` (Lines 6, 490) - Various path operations
- `app/libtextmode/font.js` (Line 4) - Font file paths
- `app/libtextmode/libtextmode.js` (Line 7) - Library file paths

**Web Alternative**: ✅ URL API, string manipulation, File API

#### 2.3 Process Module

**Platform Detection (process.platform):**
- `app/window.js` (Line 2) - Darwin-specific window handling
- `app/document/input/keyboard.js` (Line 3) - Platform-specific keyboard shortcuts
- `app/menu.js` (Line 3) - Platform-specific menus
- `app/moebius.js` (Lines 9-11) - Platform-specific initialization

**Resource Paths (process.resourcesPath):**
- `app/windows/cheatsheet.js` (Line 3)
- `app/windows/controlcharacters.js` (Line 34)
- `app/windows/numpad_mappings.js` (Line 3)
- `app/windows/splash_screen.js` (Line 7)
- `app/windows/acknowledgements.js` (Line 3)
- `app/windows/changelog.js` (Line 3)
- `app/moebius.js` (Line 111)

**Command Line Arguments (process.argv):**
- `app/moebius.js` (Line 490) - File opening from command line

**Web Alternative**: ✅ Navigator API for platform detection, bundled resources

### 3. Most Tightly Coupled Areas

#### 3.1 **CRITICAL**: Main Application Controller (`app/moebius.js`)
- **Coupling Level**: EXTREME
- **Electron Dependencies**: 35+ IPC handlers, app lifecycle, window management
- **Node.js Dependencies**: File system, path operations, process platform
- **Migration Complexity**: HIGH - Core architectural changes needed

#### 3.2 **CRITICAL**: Menu System (`app/menu.js`)
- **Coupling Level**: HIGH
- **Electron Dependencies**: 35+ IPC handlers, menu state management
- **Node.js Dependencies**: Platform detection
- **Migration Complexity**: MEDIUM - Event-driven alternative exists

#### 3.3 **CRITICAL**: File Operations (`app/controller.js`, `app/prefs.js`)
- **Coupling Level**: HIGH
- **Electron Dependencies**: Dialog APIs, IPC communication
- **Node.js Dependencies**: File system operations
- **Migration Complexity**: MEDIUM - File System Access API + fallbacks

#### 3.4 **HIGH**: Window Management (`app/window.js`, `app/senders.js`)
- **Coupling Level**: HIGH
- **Electron Dependencies**: BrowserWindow, dialog, remote APIs
- **Migration Complexity**: HIGH - Single-page app redesign needed

#### 3.5 **MEDIUM**: UI Components (modals, windows directories)
- **Coupling Level**: MEDIUM
- **Electron Dependencies**: IPC communication, remote APIs
- **Migration Complexity**: LOW - Event system replacement

#### 3.6 **LOW**: Font and Text Processing (`app/libtextmode/`)
- **Coupling Level**: LOW
- **Electron Dependencies**: None (only Node.js fs/path)
- **Node.js Dependencies**: File system for font loading
- **Migration Complexity**: LOW - Fetch API replacement

### 4. Existing Web Compatibility

#### ✅ **Already Web-Compatible Areas**
- **Core Editing Logic**: Most document/drawing tools are renderer-process only
- **Canvas Rendering**: `app/web_client/web_canvas.js` provides web implementation
- **Real-time Collaboration**: WebSocket-based, works in browsers
- **Text Processing**: `app/libtextmode/` libraries are largely pure JavaScript

#### ⚠️ **Partially Web-Compatible**
- **Server Mode**: Express.js server exists but limited functionality
- **File Handling**: Some operations work through server, others need File API
- **Preferences**: Could use localStorage instead of file system

#### ❌ **Not Web-Compatible**
- **Multi-window Architecture**: Requires major UX redesign
- **Native OS Integration**: File associations, dock menus, TouchBar
- **Direct File System Access**: Limited to newer browsers with File System Access API

### 5. Migration Priority Ranking

1. **Phase 1 (Critical)**: IPC → Event System Migration
2. **Phase 2 (Critical)**: File Operations → File System Access API + Fallbacks  
3. **Phase 3 (High)**: Window Management → Single-Page App Architecture
4. **Phase 4 (Medium)**: Platform Integration → PWA APIs where possible
5. **Phase 5 (Low)**: TouchBar & macOS-specific features → Accept feature loss

### 6. Recommendations

#### Short Term (1-2 weeks)
- Expand existing web client capabilities
- Implement File System Access API with fallbacks
- Create IPC → EventEmitter bridge layer

#### Medium Term (1-2 months)
- Redesign multi-window UX for single-page architecture
- Implement comprehensive preference storage using IndexedDB
- Create comprehensive fallback systems for unsupported browsers

#### Long Term (3-4 months)
- Complete Electron → Web migration
- PWA implementation with offline capabilities
- Cross-browser compatibility testing and optimization

---

**Analysis Date**: August 20, 2025  
**Total Files Analyzed**: 66 JavaScript files  
**Total Dependencies Found**: 100+ instances across 26 files