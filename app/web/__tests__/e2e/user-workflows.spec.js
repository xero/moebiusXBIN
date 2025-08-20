// User workflows end-to-end tests
// app/web/__tests__/e2e/user-workflows.spec.js

const { test, expect } = require('@playwright/test');
const { testHelpers } = require('../setup/test-helpers');

test.describe('Core User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full ASCII art creation workflow', async ({ page }) => {
    // Create new document
    await page.click('[data-testid="new-document"]');
    
    // Select canvas size
    await page.selectOption('[data-testid="canvas-width"]', '80');
    await page.selectOption('[data-testid="canvas-height"]', '25');
    await page.click('[data-testid="create-document"]');
    
    // Draw some ASCII art
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click({ position: { x: 10, y: 10 } });
    await page.keyboard.type('Hello World!');
    
    // Change color
    await page.click('[data-testid="color-palette"] [data-color="red"]');
    await canvas.click({ position: { x: 10, y: 30 } });
    await page.keyboard.type('In Color!');
    
    // Save document
    await page.keyboard.press('Control+S');
    
    // Verify save dialog appears
    await expect(page.locator('[data-testid="save-dialog"]')).toBeVisible();
    
    // Enter filename
    await page.fill('[data-testid="filename-input"]', 'test-artwork.ans');
    await page.click('[data-testid="save-button"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should handle file opening and editing workflow', async ({ page }) => {
    // Open file
    await page.click('[data-testid="open-file"]');
    
    // Upload test file
    await testHelpers.uploadFile(page, './app/web/__tests__/fixtures/sample.ans');
    
    // Verify file content loads
    await expect(page.locator('[data-testid="document-content"]')).toBeVisible();
    
    // Edit the document
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.keyboard.type('EDITED');
    
    // Verify document is marked as modified
    await expect(page.locator('[data-testid="document-modified"]')).toBeVisible();
    
    // Save changes
    await page.keyboard.press('Control+S');
    
    // Verify save completion
    await expect(page.locator('[data-testid="document-modified"]')).not.toBeVisible();
  });

  test('should support undo/redo operations', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Draw something
    await canvas.click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('First');
    
    // Draw something else
    await canvas.click({ position: { x: 50, y: 70 } });
    await page.keyboard.type('Second');
    
    // Undo last action
    await page.keyboard.press('Control+Z');
    
    // Verify "Second" is gone
    let content = await page.textContent('[data-testid="canvas"]');
    expect(content).toContain('First');
    expect(content).not.toContain('Second');
    
    // Redo
    await page.keyboard.press('Control+Y');
    
    // Verify "Second" is back
    content = await page.textContent('[data-testid="canvas"]');
    expect(content).toContain('Second');
  });

  test('should support font switching workflow', async ({ page }) => {
    // Open font browser
    await page.click('[data-testid="fonts-menu"]');
    await page.click('[data-testid="font-browser"]');
    
    // Wait for font list to load
    await expect(page.locator('[data-testid="font-list"]')).toBeVisible();
    
    // Select a different font
    await page.click('[data-testid="font-item"][data-font="ibm-vga-9x16"]');
    
    // Verify font is applied
    const fontChanged = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas"]');
      return canvas.dataset.currentFont === 'ibm-vga-9x16';
    });
    
    expect(fontChanged).toBe(true);
    
    // Type with new font
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click();
    await page.keyboard.type('New Font Text');
    
    // Verify text appears with new font properties
    const content = await page.textContent('[data-testid="canvas"]');
    expect(content).toContain('New Font Text');
  });

  test('should handle collaborative editing workflow', async ({ page, context }) => {
    // Create a new document
    await page.click('[data-testid="new-document"]');
    await page.click('[data-testid="create-document"]');
    
    // Start collaboration
    await page.click('[data-testid="share-document"]');
    
    // Get collaboration link
    const shareUrl = await page.inputValue('[data-testid="share-url"]');
    expect(shareUrl).toContain('share/');
    
    // Open another page (simulating another user)
    const page2 = await context.newPage();
    await page2.goto(shareUrl);
    
    // Make changes from first user
    const canvas1 = page.locator('[data-testid="canvas"]');
    await canvas1.click({ position: { x: 10, y: 10 } });
    await page.keyboard.type('User 1');
    
    // Verify changes appear on second user's page
    await page2.waitForTimeout(1000); // Wait for real-time sync
    const content2 = await page2.textContent('[data-testid="canvas"]');
    expect(content2).toContain('User 1');
    
    // Make changes from second user
    const canvas2 = page2.locator('[data-testid="canvas"]');
    await canvas2.click({ position: { x: 10, y: 30 } });
    await page2.keyboard.type('User 2');
    
    // Verify changes appear on first user's page
    await page.waitForTimeout(1000);
    const content1 = await page.textContent('[data-testid="canvas"]');
    expect(content1).toContain('User 2');
  });

  test('should handle copy/paste operations', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Draw a selection
    await canvas.click({ position: { x: 10, y: 10 } });
    await page.keyboard.type('COPY ME');
    
    // Select the text
    await testHelpers.selectCanvasArea(page, 10, 10, 80, 30);
    
    // Copy selection
    await page.keyboard.press('Control+C');
    
    // Move to different location
    await canvas.click({ position: { x: 10, y: 50 } });
    
    // Paste
    await page.keyboard.press('Control+V');
    
    // Verify content was pasted
    const content = await page.textContent('[data-testid="canvas"]');
    const copyCount = (content.match(/COPY ME/g) || []).length;
    expect(copyCount).toBe(2);
  });

  test('should handle window management workflow', async ({ page }) => {
    // Open preferences window
    await page.click('[data-testid="edit-menu"]');
    await page.click('[data-testid="preferences"]');
    
    // Verify preferences window opens
    await expect(page.locator('[data-testid="preferences-window"]')).toBeVisible();
    
    // Change a preference
    await page.check('[data-testid="show-grid"]');
    
    // Apply changes
    await page.click('[data-testid="apply-preferences"]');
    
    // Close preferences
    await page.click('[data-testid="close-preferences"]');
    
    // Verify grid is now visible on canvas
    await expect(page.locator('[data-testid="canvas-grid"]')).toBeVisible();
    
    // Open font browser in new window
    await page.click('[data-testid="fonts-menu"]');
    await page.click('[data-testid="font-browser"]');
    
    // Verify both main window and font browser are visible
    await expect(page.locator('[data-testid="main-window"]')).toBeVisible();
    await expect(page.locator('[data-testid="font-browser-window"]')).toBeVisible();
  });
});

test.describe('Error Handling Workflows', () => {
  test('should handle file load errors gracefully', async ({ page }) => {
    // Try to open an invalid file
    await page.click('[data-testid="open-file"]');
    
    // Upload invalid file
    await testHelpers.uploadFile(page, './app/web/__tests__/fixtures/invalid.txt');
    
    // Verify error message appears
    await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
    
    // Verify app remains functional
    await page.click('[data-testid="new-document"]');
    await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
  });

  test('should recover from network errors', async ({ page }) => {
    // Go offline
    await testHelpers.goOffline(page);
    
    // Try to save (should work offline with service worker)
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click();
    await page.keyboard.type('Offline content');
    await page.keyboard.press('Control+S');
    
    // Verify offline save notification
    await expect(page.locator('[data-testid="offline-save"]')).toBeVisible();
    
    // Go back online
    await testHelpers.goOnline(page);
    
    // Verify sync occurs
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
  });
});