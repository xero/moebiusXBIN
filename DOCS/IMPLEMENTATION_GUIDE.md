# MoebiusXBIN Web Architecture Implementation Guide
## Practical Development Steps & Code Organization

This document provides concrete implementation guidance to accompany the [Detailed Migration Plan](./DETAILED_MIGRATION_PLAN.md), focusing on practical development steps, code organization, and technical decision-making.

---

## 🏗️ PHASE 1 IMPLEMENTATION GUIDE

### Week 1-2: IPC System Replacement Implementation

#### Step 1.1: Create Web Event Bus Foundation
**Location**: `app/web/core/event-bus.js`

```javascript
// Implementation Priority: CRITICAL
// Dependencies: None
// Estimated Effort: 2-3 days

class WebEventBus extends EventEmitter {
    constructor() {
        super();
        this.documentId = this.generateDocumentId();
        this.responseHandlers = new Map();
        this.setupGlobalHandlers();
    }
    
    // Implementation pattern from CODE_MIGRATION_EXAMPLES.md
    // Focus on maintaining exact API compatibility with existing senders.js
}
```

**Testing Strategy**:
```javascript
// app/web/core/__tests__/event-bus.test.js
describe('WebEventBus', () => {
    test('maintains API compatibility with electron.ipcRenderer', () => {
        // Test send(), sendSync(), on() methods
    });
    
    test('handles high-frequency events without memory leaks', () => {
        // Performance and memory tests
    });
});
```

#### Step 1.2: Create Migration Bridge
**Location**: `app/web/bridges/ipc-bridge.js`

```javascript
// Gradual migration utility
class IPCBridge {
    constructor(useWebEventBus = false) {
        this.useWeb = useWebEventBus;
        this.electronIPC = require('electron').ipcRenderer;
        this.webEventBus = new WebEventBus();
    }
    
    send(channel, data) {
        return this.useWeb ? 
            this.webEventBus.send(channel, data) : 
            this.electronIPC.send(channel, data);
    }
    
    // Allow feature-flag based switching during development
}
```

#### Step 1.3: Convert High-Priority IPC Calls
**Priority Order**:
1. `app/senders.js` - Core communication methods
2. `app/menu.js` - Menu system IPC (35+ calls)
3. `app/moebius.js` - Document lifecycle events
4. Modal components in `app/modals/`

**Implementation Pattern**:
```javascript
// Before: app/senders.js
const electron = require("electron");
function send(channel, opts) {
    electron.ipcRenderer.send(channel, {
        id: electron.remote.getCurrentWindow().id, 
        ...opts
    });
}

// After: app/web/core/senders.js
import { eventBus } from './event-bus.js';
function send(channel, opts) {
    eventBus.send(channel, {
        id: eventBus.documentId,
        ...opts
    });
}
```

---

### Week 3-4: File System Operations Implementation

#### Step 3.1: Web File System Abstraction
**Location**: `app/web/core/file-system.js`

```javascript
// Implementation based on COMPREHENSIVE_MIGRATION_RECIPES.md
// Focus on File System Access API with robust fallbacks

class WebFileSystem {
    constructor() {
        this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
        this.db = null;
        this.initDB();
    }
    
    // Implement comprehensive fallback strategy
    async openFile() {
        if (this.supportsFileSystemAccess) {
            return await this.openWithFileSystemAPI();
        } else {
            return await this.openWithInput();
        }
    }
}
```

#### Step 3.2: Preference System Migration
**Location**: `app/web/core/preferences.js`

```javascript
// Migrate app/prefs.js to web-compatible storage
// Maintain exact API compatibility for gradual migration

class WebPreferences {
    constructor() {
        this.storageKey = 'moebiusxbin_preferences';
        this.defaultValues = {
            // Copy from existing app/prefs.js default_values
        };
    }
    
    // Implement localStorage + IndexedDB hybrid approach
    async set(key, value) {
        // Primary: localStorage for speed
        // Backup: IndexedDB for reliability
    }
    
    get(key) {
        // Return from localStorage with IndexedDB fallback
    }
}
```

#### Step 3.3: Data Migration Utilities
**Location**: `app/web/tools/migration-tools.js`

```javascript
// Tools for migrating existing Electron user data
class DataMigrator {
    async migrateElectronPreferences() {
        // Read from Electron userData directory
        // Convert and import to web storage
    }
    
    async exportUserData() {
        // Create backup before migration
    }
    
    async validateMigration() {
        // Ensure data integrity after migration
    }
}
```

---

## 🏗️ PHASE 2 IMPLEMENTATION GUIDE

### Week 5-6: Window Management System

#### Step 5.1: Core Window Manager Architecture
**Location**: `app/web/ui/window-manager.js`

```javascript
// Complete implementation based on CODE_MIGRATION_EXAMPLES.md
// Focus on DOM-based window simulation

class WebWindowManager {
    constructor() {
        this.windows = new Map();
        this.modals = new Map();
        this.activeWindow = null;
        this.zIndexCounter = 1000;
        this.setupContainer();
    }
    
    // Implement full window lifecycle management
    createWindow(id, options) {
        // Create DOM-based window with title bar, resize handles
    }
    
    createModal(id, content, options) {
        // Overlay-based modal system
    }
}
```

#### Step 5.2: Window Styling & Responsiveness
**Location**: `app/web/css/window-system.css`

```css
/* Responsive window system */
.web-window {
    /* Desktop: full window simulation */
    /* Tablet: adapted container layout */
    /* Mobile: fullscreen single window */
}

@media (max-width: 768px) {
    /* Mobile-specific window adaptations */
    .web-window {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
}
```

#### Step 5.3: Document Window Implementation
**Location**: `app/web/ui/document-window.js`

```javascript
// Convert app/html/document.html to web component
class DocumentWindow extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.setupDocumentInterface();
    }
    
    setupDocumentInterface() {
        // Recreate document editing interface
        // Maintain exact same functionality as Electron version
    }
}

customElements.define('document-window', DocumentWindow);
```

---

### Week 7-8: Dialog System Implementation

#### Step 7.1: Dialog Component Library
**Location**: `app/web/ui/dialogs/`

```
dialogs/
├── base-dialog.js          # Common dialog functionality
├── message-dialog.js       # Alert/info dialogs
├── confirm-dialog.js       # Yes/no confirmations
├── input-dialog.js         # Text input dialogs
├── progress-dialog.js      # Progress indicators
├── file-dialog.js          # File selection wrapper
└── dialog-manager.js       # Global dialog coordination
```

#### Step 7.2: Dialog Base Class
**Location**: `app/web/ui/dialogs/base-dialog.js`

```javascript
class BaseDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.setupEventHandlers();
        this.setupAccessibility();
    }
    
    setupAccessibility() {
        // WCAG 2.1 AA compliance
        this.setAttribute('role', 'dialog');
        this.setAttribute('aria-modal', 'true');
        this.setupFocusManagement();
    }
    
    show() {
        // Animation and focus management
    }
    
    close() {
        // Cleanup and focus restoration
    }
}
```

---

## 🏗️ PHASE 3 IMPLEMENTATION GUIDE

### Week 9-10: Font Management System

#### Step 9.1: Web Font Registry
**Location**: `app/web/graphics/font-registry.js`

```javascript
// Based on existing app/font_registry.js
// Enhanced for web capabilities

class WebFontRegistry {
    constructor() {
        this.fonts = new Map();
        this.fontCache = new Map();
        this.loadedFonts = new Set();
        this.initDB();
    }
    
    async loadFont(fontInfo) {
        // Handle multiple font formats:
        // - .f bitmap fonts (existing format)
        // - TrueType/OpenType via FontFace API
        // - Custom uploaded fonts
    }
    
    async addCustomFont(file) {
        // File upload handling
        // Font validation and parsing
        // IndexedDB persistence
    }
}
```

#### Step 9.2: Font Browser Interface
**Location**: `app/web/ui/font-browser.js`

```javascript
// Rebuild app/html/font_browser.html as web component
class FontBrowser extends HTMLElement {
    constructor() {
        super();
        this.fontRegistry = new WebFontRegistry();
        this.setupInterface();
    }
    
    setupInterface() {
        // Font list with preview
        // Search and filter capabilities
        // Font upload area
        // Preview canvas
    }
    
    renderFontPreview(fontData) {
        // Canvas-based font preview
        // Support for bitmap fonts
    }
}
```

---

### Week 11-12: Menu System Implementation

#### Step 11.1: Web Menu System
**Location**: `app/web/ui/menu-system.js`

```javascript
// Complete implementation from COMPREHENSIVE_MIGRATION_RECIPES.md
class WebMenuSystem {
    constructor() {
        this.shortcuts = new Map();
        this.contextMenus = new Map();
        this.setupKeyboardHandlers();
    }
    
    createMenuBar(template) {
        // Convert Electron menu template to web elements
        // Maintain exact same structure and functionality
    }
    
    registerShortcut(accelerator, callback) {
        // Cross-platform keyboard shortcut handling
        // Convert Electron accelerator format
    }
}
```

#### Step 11.2: Menu Integration
**Location**: `app/web/ui/application-menu.js`

```javascript
// Integrate with existing menu structure from app/menu.js
class ApplicationMenu {
    constructor() {
        this.menuSystem = new WebMenuSystem();
        this.createMainMenu();
    }
    
    createMainMenu() {
        // Recreate existing menu structure
        // Connect to web-compatible actions
        
        const menuTemplate = [
            {
                label: "File",
                submenu: [
                    { 
                        label: "New", 
                        accelerator: "CmdOrCtrl+N", 
                        click: () => this.newDocument() 
                    },
                    // ... rest of menu structure
                ]
            }
        ];
        
        this.menuSystem.createMenuBar(menuTemplate);
    }
}
```

---

## 🏗️ PHASE 4 IMPLEMENTATION GUIDE

### Week 13-14: PWA Implementation

#### Step 13.1: Service Worker Setup
**Location**: `app/web/sw.js`

```javascript
// Based on COMPREHENSIVE_MIGRATION_RECIPES.md PWA patterns
const CACHE_NAME = 'moebiusxbin-v1.0.0';
const STATIC_ASSETS = [
    '/',
    '/app/web/css/main.css',
    '/app/web/js/main.js',
    '/app/fonts/IBM_VGA_8x16.f',
    // ... other critical assets
];

// Implement comprehensive caching strategy
self.addEventListener('fetch', (event) => {
    // Handle different asset types appropriately
    if (event.request.destination === 'font') {
        event.respondWith(handleFontRequest(event.request));
    } else if (event.request.url.includes('/app/web/')) {
        event.respondWith(handleStaticAsset(event.request));
    }
});
```

#### Step 13.2: Web App Manifest
**Location**: `app/web/manifest.json`

```json
{
    "name": "MoebiusXBIN",
    "short_name": "Moebius",
    "description": "ASCII/ANSI Art Editor with custom font and color support",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#292c33",
    "background_color": "#292c33",
    "icons": [
        // Progressive icon sizes
    ],
    "file_handlers": [
        {
            "action": "/",
            "accept": {
                "text/plain": [".ans", ".bin", ".xb", ".diz", ".nfo"]
            }
        }
    ]
}
```

---

## 📁 PROJECT STRUCTURE & ORGANIZATION

### Recommended File Organization
```
app/
├── web/                        # New web-specific code
│   ├── core/                   # Core web functionality
│   │   ├── event-bus.js        # IPC replacement
│   │   ├── file-system.js      # File operations
│   │   ├── preferences.js      # Settings management
│   │   └── platform-detector.js
│   ├── ui/                     # User interface components
│   │   ├── window-manager.js   # Window management
│   │   ├── dialogs/           # Dialog components
│   │   ├── menu-system.js     # Menu implementation
│   │   └── components/        # Reusable UI components
│   ├── graphics/              # Graphics and rendering
│   │   ├── font-registry.js   # Font management
│   │   ├── canvas-renderer.js # Canvas operations
│   │   └── color-manager.js   # Color handling
│   ├── bridges/               # Electron-to-Web bridges
│   │   ├── ipc-bridge.js      # IPC compatibility layer
│   │   └── file-bridge.js     # File operation bridge
│   ├── tools/                 # Migration and utility tools
│   │   ├── migration-tools.js # Data migration utilities
│   │   └── debugging-tools.js # Development aids
│   ├── css/                   # Web-specific styling
│   │   ├── main.css          # Main application styles
│   │   ├── window-system.css # Window management styles
│   │   └── responsive.css    # Mobile adaptations
│   ├── sw.js                 # Service worker
│   ├── manifest.json         # PWA manifest
│   └── main.js              # Web application entry point
├── (existing electron files remain unchanged during migration)
└── ...
```

### Development Workflow Integration

#### Build Process Enhancement
**Location**: `package.json`

```json
{
  "scripts": {
    "start": "electron --no-sandbox --inspect=5858 .",
    "start:web": "vite serve app/web --host",
    "build:web": "vite build app/web --outDir ../../dist/web",
    "test:web": "jest app/web",
    "test:e2e": "playwright test",
    "lint:web": "eslint app/web/",
    "preview:web": "vite preview"
  }
}
```

#### Testing Strategy Implementation
**Location**: `app/web/__tests__/`

```
__tests__/
├── unit/                      # Unit tests
│   ├── core/                 # Core functionality tests
│   ├── ui/                   # UI component tests
│   └── graphics/             # Graphics and font tests
├── integration/              # Integration tests
│   ├── window-management.test.js
│   ├── file-operations.test.js
│   └── menu-system.test.js
├── e2e/                      # End-to-end tests
│   ├── user-workflows.spec.js
│   ├── cross-browser.spec.js
│   └── performance.spec.js
└── fixtures/                 # Test data and fixtures
```

---

## 🔧 DEVELOPMENT TOOLS & SETUP

### Required Development Tools
```bash
# Core development dependencies
npm install --save-dev vite @vitejs/plugin-legacy
npm install --save-dev jest @testing-library/jest-dom
npm install --save-dev playwright @playwright/test
npm install --save-dev eslint eslint-config-web-standard
npm install --save-dev workbox-cli workbox-webpack-plugin

# Web-specific runtime dependencies
npm install --save-prod eventemitter3 idb
npm install --save-prod canvas jsdom # For server-side rendering if needed
```

### Vite Configuration
**Location**: `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
    root: 'app/web',
    plugins: [
        legacy({
            targets: ['defaults', 'not IE 11']
        })
    ],
    build: {
        outDir: '../../dist/web',
        rollupOptions: {
            input: {
                main: 'app/web/index.html',
                sw: 'app/web/sw.js'
            }
        }
    },
    server: {
        port: 3000,
        host: true
    }
});
```

### Jest Configuration
**Location**: `jest.config.js`

```javascript
module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/app/web'],
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/app/web/__tests__/setup.js'],
    collectCoverageFrom: [
        'app/web/**/*.js',
        '!app/web/**/*.test.js',
        '!app/web/sw.js'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
```

---

## 🚀 DEPLOYMENT & CI/CD PIPELINE

### GitHub Actions Workflow
**Location**: `.github/workflows/web-build.yml`

```yaml
name: Web Application CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['app/web/**']
  pull_request:
    branches: [main]
    paths: ['app/web/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint:web
      - run: npm run test:web
      - run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build:web
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          # Deploy to staging environment
          
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          # Deploy to production environment
```

### Performance Monitoring Setup
**Location**: `app/web/core/monitoring.js`

```javascript
// Real User Monitoring integration
class PerformanceMonitor {
    constructor() {
        this.vitals = [];
        this.setupWebVitals();
    }
    
    setupWebVitals() {
        // Core Web Vitals monitoring
        import('web-vitals').then(({ getLCP, getFID, getCLS, getFCP, getTTFB }) => {
            getLCP(this.sendToAnalytics);
            getFID(this.sendToAnalytics);
            getCLS(this.sendToAnalytics);
            getFCP(this.sendToAnalytics);
            getTTFB(this.sendToAnalytics);
        });
    }
    
    sendToAnalytics(metric) {
        // Send performance data to monitoring service
        console.log('Performance metric:', metric);
    }
}
```

This implementation guide provides the concrete technical foundation needed to execute the migration plan successfully, with specific file structures, code examples, and development workflow integration.