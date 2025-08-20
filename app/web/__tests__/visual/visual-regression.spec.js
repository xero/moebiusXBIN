const { test, expect } = require('@playwright/test');

/**
 * Visual Regression Tests for MoebiusXBIN
 * 
 * These tests capture screenshots and compare them against baseline images
 * to detect unintended visual changes in the UI.
 */

test.describe('Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for all content to load
    await page.waitForLoadState('networkidle');
    
    // Wait for fonts to load fully to ensure consistent rendering
    await page.waitForFunction(() => document.fonts.ready);
    
    // Hide dynamic content that changes between runs
    await page.addStyleTag({
      content: `
        .timestamp, .version-info, .session-id, .cursor-blink {
          visibility: hidden !important;
        }
        /* Disable animations for consistent screenshots */
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
          animation-play-state: paused !important;
        }
      `
    });
    
    // Allow time for styles to apply
    await page.waitForTimeout(500);
  });

  test('main interface layout', async ({ page }) => {
    // Test the main editor interface
    await expect(page).toHaveScreenshot('main-interface.png', {
      // Allow small differences for font rendering variations
      threshold: 0.1,
      // Ensure full page is captured
      fullPage: true,
      // Mask elements that might have dynamic content
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('.version-display')
      ]
    });
  });

  test('color palette expanded', async ({ page }) => {
    // Expand the color palette
    const colorPaletteButton = page.locator('[data-testid="color-palette-toggle"]');
    if (await colorPaletteButton.isVisible()) {
      await colorPaletteButton.click();
      await page.waitForTimeout(300); // Wait for expansion animation
    }
    
    // Capture the expanded color palette
    const palette = page.locator('[data-testid="color-palette"]');
    await expect(palette).toHaveScreenshot('color-palette-expanded.png', {
      threshold: 0.05
    });
  });

  test('file menu open', async ({ page }) => {
    // Open the file menu
    const fileMenuButton = page.locator('[data-testid="file-menu"]');
    if (await fileMenuButton.isVisible()) {
      await fileMenuButton.click();
      await page.waitForTimeout(200); // Wait for menu to appear
    }
    
    // Capture the open file menu
    const menu = page.locator('[data-testid="file-menu-dropdown"]');
    await expect(menu).toHaveScreenshot('file-menu-open.png', {
      threshold: 0.05
    });
  });

  test('canvas with content', async ({ page }) => {
    // Add some content to the canvas to test rendering
    const canvas = page.locator('[data-testid="canvas"]');
    if (await canvas.isVisible()) {
      await canvas.click({ position: { x: 100, y: 100 } });
      
      // Type some ASCII art
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');
      await page.keyboard.type('World!');
      
      // Wait for content to be drawn
      await page.waitForTimeout(300);
    }
    
    // Capture the canvas with content
    await expect(canvas).toHaveScreenshot('canvas-with-content.png', {
      threshold: 0.1
    });
  });

  test('mobile layout portrait', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.waitForTimeout(500); // Wait for responsive layout
    
    // Capture mobile layout
    await expect(page).toHaveScreenshot('mobile-layout-portrait.png', {
      threshold: 0.1,
      fullPage: true
    });
  });

  test('high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ 
      media: 'screen',
      colorScheme: 'dark',
      forcedColors: 'active'
    });
    
    await page.waitForTimeout(500); // Wait for theme to apply
    
    // Capture high contrast mode
    await expect(page).toHaveScreenshot('high-contrast-mode.png', {
      threshold: 0.2, // Higher threshold for color scheme differences
      fullPage: true
    });
  });

  test('loading state', async ({ page }) => {
    // Intercept network requests to simulate loading state
    await page.route('**/api/**', route => {
      // Delay the response to capture loading state
      setTimeout(() => route.continue(), 1000);
    });
    
    // Navigate and capture loading state quickly
    const navigationPromise = page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Try to capture loading state (if visible)
    const loadingElement = page.locator('[data-testid="loading"]');
    if (await loadingElement.isVisible({ timeout: 2000 })) {
      await expect(loadingElement).toHaveScreenshot('loading-state.png', {
        threshold: 0.05
      });
    }
    
    await navigationPromise;
  });

  test('error state display', async ({ page }) => {
    // Trigger an error state by trying to load an invalid file
    await page.route('**/invalid-file.ans', route => {
      route.fulfill({
        status: 404,
        body: 'File not found'
      });
    });
    
    // Try to load the invalid file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Simulate file selection that will fail
      await page.evaluate(() => {
        // Trigger error handling
        window.dispatchEvent(new CustomEvent('file-load-error', {
          detail: { message: 'File not found' }
        }));
      });
      
      await page.waitForTimeout(500);
    }
    
    // Capture error state if visible
    const errorElement = page.locator('[data-testid="error-message"]');
    if (await errorElement.isVisible()) {
      await expect(errorElement).toHaveScreenshot('error-state.png', {
        threshold: 0.05
      });
    }
  });
  
});

test.describe('Cross-Browser Visual Consistency', () => {
  
  test('interface renders consistently across browsers', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.fonts.ready);
    
    // Hide browser-specific elements
    await page.addStyleTag({
      content: `
        /* Hide elements that vary by browser */
        .browser-specific, .timestamp, .version-info {
          visibility: hidden !important;
        }
        /* Disable animations */
        * { animation: none !important; transition: none !important; }
      `
    });
    
    // Take browser-specific screenshot
    await expect(page).toHaveScreenshot(`interface-${browserName}.png`, {
      threshold: 0.15, // Allow for browser rendering differences
      fullPage: true
    });
  });
  
});

test.describe('Font Rendering Tests', () => {
  
  test('custom fonts render correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait specifically for custom fonts to load
    await page.waitForFunction(() => {
      // Check if our custom DOS font is loaded
      return document.fonts.check('16px "DOS VGA 437"') || 
             document.fonts.check('16px monospace'); // fallback
    });
    
    // Test text rendering with custom font
    const canvas = page.locator('[data-testid="canvas"]');
    if (await canvas.isVisible()) {
      await canvas.click();
      await page.keyboard.type('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()');
      await page.waitForTimeout(300);
    }
    
    await expect(canvas).toHaveScreenshot('font-rendering-test.png', {
      threshold: 0.1
    });
  });
  
});