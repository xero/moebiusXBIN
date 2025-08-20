// Cross-browser compatibility tests
// app/web/__tests__/e2e/cross-browser.spec.js

const { test, expect } = require('@playwright/test');
const { testHelpers } = require('../setup/test-helpers');

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should detect browser capabilities correctly', async ({ page, browserName }) => {
    const capabilities = await testHelpers.getBrowserCapabilities(page);
    
    // Verify expected capabilities per browser
    switch (browserName) {
      case 'chromium':
        expect(capabilities.fileSystemAccess).toBe(true);
        expect(capabilities.serviceWorker).toBe(true);
        break;
      case 'firefox':
        expect(capabilities.fileSystemAccess).toBe(false);
        expect(capabilities.serviceWorker).toBe(true);
        break;
      case 'webkit':
        expect(capabilities.fileSystemAccess).toBe(false);
        expect(capabilities.serviceWorker).toBe(true);
        break;
    }
    
    // Universal expectations
    expect(capabilities.indexedDB).toBe(true);
    expect(capabilities.webGL).toBe(true);
  });

  test('should handle file operations with appropriate fallbacks', async ({ page, browserName }) => {
    // Test file opening
    const fileInput = page.locator('input[type="file"]');
    
    if (['chromium'].includes(browserName)) {
      // Test File System Access API flow
      await expect(page.locator('[data-testid="file-open-modern"]')).toBeVisible();
    } else {
      // Test HTML input fallback
      await expect(fileInput).toBeVisible();
    }
    
    // Test that file operations work regardless of method
    await testHelpers.uploadFile(page, './app/web/__tests__/fixtures/sample.ans');
    
    // Verify file content is loaded
    await expect(page.locator('[data-testid="document-content"]')).toBeVisible();
  });

  test('should maintain consistent UI across browsers', async ({ page }) => {
    // Test that core UI elements are present and positioned correctly
    await expect(page.locator('[data-testid="main-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-palette"]')).toBeVisible();
    
    // Take screenshot for visual regression testing
    await testHelpers.takeScreenshot(page, `ui-layout-${page.context().browser().browserType().name()}`);
  });

  test('should handle keyboard shortcuts consistently', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click();
    
    // Test Ctrl+N (New document) - adapt for macOS
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyN`);
    
    // Verify new document dialog appears
    await expect(page.locator('[data-testid="new-document-dialog"]')).toBeVisible();
  });

  test('should perform consistently across different screen sizes', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
  });

  test('should handle fonts consistently', async ({ page, browserName }) => {
    // Load font browser
    await page.click('[data-testid="font-menu"]');
    await page.click('[data-testid="font-browser"]');
    
    // Verify font list loads
    await expect(page.locator('[data-testid="font-list"]')).toBeVisible();
    
    // Select a bitmap font
    await page.click('[data-testid="font-item"]:first-child');
    
    // Verify font is applied (implementation would check canvas rendering)
    const fontApplied = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas"]');
      return canvas && canvas.style.fontFamily !== '';
    });
    
    expect(fontApplied).toBe(true);
  });

  test('should support copy/paste operations', async ({ page, browserName }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click();
    
    // Type some text
    await page.keyboard.type('TEST');
    
    // Select all
    await page.keyboard.press('Control+A');
    
    // Copy
    await page.keyboard.press('Control+C');
    
    // Move cursor and paste
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Control+V');
    
    // Verify content was pasted
    const content = await page.textContent('[data-testid="canvas"]');
    expect(content).toContain('TESTTEST');
  });

  test('should handle errors gracefully across browsers', async ({ page }) => {
    // Simulate font loading error
    await testHelpers.simulateError(page, 'fontLoadError');
    
    await page.goto('/');
    
    // Verify error is handled gracefully
    await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible();
    
    // Verify app still functions with fallback font
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click();
    await page.keyboard.type('A');
    
    const content = await page.textContent('[data-testid="canvas"]');
    expect(content).toContain('A');
  });
});

test.describe('Browser-Specific Features', () => {
  test('Chrome/Edge specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome/Edge specific test');
    
    // Test File System Access API
    // Test advanced PWA features
    // Test clipboard API
  });

  test('Firefox specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox specific test');
    
    // Test Firefox-specific fallbacks
    // Test service worker behavior
  });

  test('Safari specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari specific test');
    
    // Test Safari storage limitations
    // Test iOS-specific behaviors
  });
});