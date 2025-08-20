# Manual Exploratory Testing Checklist

This document provides a structured approach to manual testing for edge cases that are difficult or impossible to automate effectively.

## 📱 Exotic Mobile Browser Testing

### Weekly Mobile Browser Rotation
Test on **2-3 different browsers** each week from this list:

#### **Android Browsers**
- [ ] **Samsung Internet Browser** (Latest)
  - Focus: File operations, canvas rendering, Samsung-specific optimizations
  - Test: File drag-drop, ASCII art display, color accuracy
  
- [ ] **UC Browser** (Latest)
  - Focus: Compatibility with data compression features
  - Test: Font rendering, touch drawing, offline functionality
  
- [ ] **Opera Mobile** (Latest)
  - Focus: Opera-specific features, data saving mode
  - Test: PWA installation, service worker behavior
  
- [ ] **Brave Browser** (Latest)
  - Focus: Ad/tracker blocking impact on functionality
  - Test: Canvas operations, font loading, external resources
  
- [ ] **Mi Browser** (Xiaomi devices)
  - Focus: Chinese market compatibility
  - Test: Character encoding, font rendering, file formats

#### **iOS Browsers**
- [ ] **DuckDuckGo Browser** (Latest)
  - Focus: Privacy-focused browsing impact
  - Test: Storage permissions, file operations, tracking protection effects
  
- [ ] **Firefox iOS** (Latest)
  - Focus: WebKit-based iOS browser differences
  - Test: Service worker limitations, file handling
  
- [ ] **Opera Touch** (Latest)
  - Focus: Gesture-based navigation
  - Test: Touch interactions, zoom/pan, gesture conflicts

### Mobile Browser Test Protocol

#### **Standard Test Sequence (15 minutes per browser):**

1. **Launch & First Impression** (2 minutes)
   - [ ] App loads without errors
   - [ ] Interface adapts to mobile screen
   - [ ] Touch targets are appropriately sized

2. **Core Functionality** (8 minutes)
   - [ ] Canvas drawing with finger/stylus
   - [ ] Color palette selection
   - [ ] Character typing and deletion
   - [ ] Zoom/pan operations
   - [ ] Menu navigation

3. **File Operations** (3 minutes)
   - [ ] File opening (test both File System API and fallback)
   - [ ] File saving with correct format
   - [ ] Error handling for unsupported files

4. **Edge Cases** (2 minutes)
   - [ ] Portrait/landscape orientation change
   - [ ] App switching and return
   - [ ] Network connectivity loss/restore

#### **Mobile Testing Report Template:**
```markdown
## Mobile Browser Test: [Browser Name] v[Version]
**Date:** [YYYY-MM-DD]
**Device:** [Device Model/OS Version]
**Tester:** [Name]

### Results:
✅ **Working Perfectly:**
- [List fully functional features]

⚠️ **Minor Issues:**
- [List minor problems with workarounds]

❌ **Broken/Major Issues:**
- [List serious problems or broken features]

### Performance Notes:
- Loading time: [X] seconds
- Drawing responsiveness: [Excellent/Good/Poor]
- Memory usage: [Normal/High/Concerning]

### Specific Observations:
- [Any browser-specific quirks or differences]
- [User experience notes]
- [Compatibility concerns]

### Screenshots:
[Attach screenshots of any issues]
```

---

## 🏠 Real-World PWA Installation Testing

### Cross-Platform Installation Verification

#### **Desktop Installation** (Monthly testing)

##### **Chrome Desktop**
- [ ] **Install via address bar icon**
  - Navigate to app, click install icon in address bar
  - Verify standalone window opens correctly
  - Check taskbar/dock integration

- [ ] **Install via menu**
  - Chrome menu → "Install [App Name]"
  - Verify app icon appears in applications menu
  - Test launch from start menu/applications folder

##### **Edge Desktop**
- [ ] **Install via app menu**
  - Edge menu → Apps → "Install this site as an app"
  - Verify app appears in Windows Start menu
  - Test pinning to taskbar

##### **Safari Desktop** (macOS)
- [ ] **Manual testing on macOS**
  - Note: Safari has limited PWA support
  - Test basic web app functionality
  - Document differences from Chromium browsers

#### **Mobile Installation** (Bi-weekly testing)

##### **Chrome Android**
- [ ] **Banner installation**
  - Wait for install banner to appear automatically
  - Test "Add to Home Screen" from banner
  - Verify app icon on home screen

- [ ] **Menu installation**
  - Chrome menu → "Add to Home screen"
  - Customize app name and icon
  - Test launch from home screen

##### **Safari iOS**
- [ ] **Share menu installation**
  - Tap Share button → "Add to Home Screen"
  - Verify app icon and splash screen
  - Test standalone mode (no Safari UI)

##### **Samsung Internet**
- [ ] **Samsung-specific installation**
  - Test Samsung's custom install prompt
  - Verify Samsung app drawer integration
  - Test with Samsung DeX mode

### PWA Installation Checklist

#### **Pre-Installation Verification:**
- [ ] Manifest file is valid and accessible
- [ ] Service worker is registered successfully
- [ ] App is served over HTTPS
- [ ] Icons are properly configured (multiple sizes)
- [ ] App passes PWA installability criteria

#### **Post-Installation Testing:**
- [ ] **Standalone Launch**
  - App opens in standalone window (no browser UI)
  - Navigation works correctly
  - Back/forward behavior is appropriate

- [ ] **Icon & Branding**
  - App icon displays correctly in launcher
  - App name appears as expected
  - Splash screen shows during launch (mobile)

- [ ] **Offline Functionality**
  - Disconnect from internet
  - Verify core features work offline
  - Test offline messaging and error handling

- [ ] **File Associations** (where supported)
  - Test opening .ans/.bin files directly
  - Verify app launches and loads file correctly

#### **Installation Issues Troubleshooting:**

##### **Common Problems:**
- **Install banner doesn't appear:** Check PWA criteria, manifest, service worker
- **App won't install:** Verify HTTPS, check console for errors
- **Wrong icon/name:** Review manifest.json configuration
- **Standalone mode not working:** Check display mode in manifest

---

## ♿ Accessibility Edge Case Testing

### Screen Reader Compatibility

#### **Monthly Screen Reader Testing:**

##### **NVDA (Windows) - Free**
- [ ] **Navigation Testing**
  - Use NVDA + Chrome/Edge to navigate entire interface
  - Verify all interactive elements are announced
  - Test landmark navigation (headings, regions)

- [ ] **Canvas Interaction**
  - Test how NVDA announces canvas content
  - Verify keyboard navigation within canvas area
  - Check if drawing actions provide audio feedback

##### **JAWS (Windows) - If Available**
- [ ] **Form and Button Testing**
  - Test all form controls and buttons
  - Verify proper labels and descriptions
  - Check keyboard shortcuts work

##### **VoiceOver (macOS/iOS)**
- [ ] **Safari + VoiceOver Testing**
  - Navigate using VoiceOver gestures
  - Test rotor navigation
  - Verify proper heading structure

#### **Keyboard-Only Navigation** (Weekly - 10 minutes)

##### **Complete Keyboard Test:**
- [ ] **Tab Navigation**
  - Tab through entire interface in logical order
  - Verify all interactive elements are reachable
  - Check focus indicators are visible

- [ ] **Keyboard Shortcuts**
  - Test all documented keyboard shortcuts
  - Verify no conflicts with screen reader shortcuts
  - Check custom shortcuts work across browsers

- [ ] **Modal and Dialog Handling**
  - Open dialogs using keyboard
  - Verify focus is trapped within modal
  - Test escape key to close dialogs

#### **High Contrast Mode Testing** (Bi-weekly)

##### **Windows High Contrast Themes:**
- [ ] **High Contrast Black**
  - Navigate interface with high contrast theme
  - Verify all text is readable
  - Check that custom colors don't override system theme

- [ ] **High Contrast White**
  - Test with inverted color scheme
  - Verify icons and graphics remain recognizable
  - Check color coding still works

##### **Browser Zoom Testing:**
- [ ] **200% Zoom Level**
  - No horizontal scrolling on standard viewport
  - All text remains readable
  - UI elements don't overlap

- [ ] **300% Zoom Level**
  - Critical functionality remains accessible
  - Navigation elements stay usable
  - Text doesn't get cut off

---

## 🌐 Network Edge Case Testing

### Extreme Network Conditions

#### **Low Bandwidth Testing** (Monthly)

##### **2G Network Simulation:**
- [ ] **Chrome DevTools Throttling**
  - Set network to "Slow 3G" or "2G"
  - Test initial page load experience
  - Verify progressive enhancement works

- [ ] **Font Loading Behavior**
  - Check graceful fallback when custom fonts fail
  - Verify app remains functional with system fonts
  - Test font loading timeout handling

##### **Intermittent Connectivity:**
- [ ] **Connect/Disconnect Testing**
  - Load app, then disconnect network mid-operation
  - Reconnect and verify state recovery
  - Test offline notifications and online restoration

#### **Corporate Network Testing** (Quarterly)

##### **Proxy and Firewall Testing:**
- [ ] **Service Worker Registration**
  - Test behind corporate proxy
  - Verify service worker installation
  - Check cache strategy works with proxy

- [ ] **WebSocket Connections** (if used)
  - Test real-time features through firewall
  - Verify fallback mechanisms work
  - Check timeout handling

---

## 💻 Hardware-Specific Scenarios

### Device-Specific Testing

#### **Low-End Device Testing** (Monthly)

##### **Older Tablets/Phones:**
- [ ] **Performance on Limited RAM**
  - Test on devices with 2GB RAM or less
  - Monitor memory usage during long sessions
  - Verify app doesn't crash under memory pressure

- [ ] **Slower Processors**
  - Test drawing responsiveness on older devices
  - Verify animations don't stutter
  - Check file operation performance

#### **High-DPI Display Testing** (Quarterly)

##### **4K and Retina Displays:**
- [ ] **Canvas Scaling**
  - Verify ASCII art displays crisply
  - Check pixel-perfect rendering
  - Test zoom operations on high-DPI

- [ ] **UI Element Sizing**
  - Verify buttons and controls are appropriately sized
  - Check text readability at high resolutions
  - Test touch targets on high-DPI touchscreens

---

## 📋 Weekly Manual Testing Schedule

### **Monday: Mobile Browser Focus** (30 minutes)
- Test 2-3 exotic mobile browsers from rotation
- Focus on any features changed in the past week
- Document browser-specific quirks or issues

### **Wednesday: PWA Installation Testing** (20 minutes)
- Install app on at least one new platform
- Test complete user workflow offline
- Verify update mechanisms and notifications

### **Friday: Accessibility Spot Check** (25 minutes)
- Keyboard-only navigation test
- Screen reader compatibility check (if available)
- High contrast mode verification

### **Monthly Deep Dive:** (2 hours)
- Comprehensive accessibility testing
- Corporate network environment testing
- High-DPI and low-end device testing
- Visual baseline review and updates

---

## 🔄 Maintenance Schedule

### **Weekly Tasks:**
- [ ] Run manual testing schedule
- [ ] Document any issues found
- [ ] Update browser rotation list
- [ ] Review automated test failures

### **Monthly Tasks:**
- [ ] Update exotic browser list with latest versions
- [ ] Review and update test procedures
- [ ] Clean up testing documentation
- [ ] Analyze patterns in manual testing findings

### **Quarterly Tasks:**
- [ ] Major device and browser environment testing
- [ ] Review and update testing checklist
- [ ] Evaluate new browsers entering market
- [ ] Training update for team members

---

*This checklist should be used alongside the automated test suite to ensure comprehensive coverage of edge cases that are difficult to automate. All findings should be documented and inform future automation efforts where possible.*