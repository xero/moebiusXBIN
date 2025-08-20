// Test helpers and utilities
// app/web/__tests__/setup/test-helpers.js

export const testHelpers = {
  /**
   * Canvas interaction helpers
   */
  async drawOnCanvas(page, x, y, character) {
    await page.click('[data-testid="canvas"]', { position: { x, y } });
    await page.keyboard.type(character);
  },

  async selectCanvasArea(page, startX, startY, endX, endY) {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
  },

  /**
   * File operation helpers
   */
  async uploadFile(page, filePath, fileType = 'text/plain') {
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  },

  async downloadFile(page, triggerSelector) {
    const downloadPromise = page.waitForEvent('download');
    await page.click(triggerSelector);
    return await downloadPromise;
  },

  /**
   * Performance measurement helpers
   */
  async measurePerformance(page, action) {
    const start = Date.now();
    await action();
    return Date.now() - start;
  },

  async measurePageLoad(page, url) {
    const start = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - start;
  },

  /**
   * Browser detection helpers
   */
  async getBrowserCapabilities(page) {
    return await page.evaluate(() => ({
      fileSystemAccess: 'showOpenFilePicker' in window,
      indexedDB: 'indexedDB' in window,
      serviceWorker: 'serviceWorker' in navigator,
      webGL: !!document.createElement('canvas').getContext('webgl'),
      touchSupport: 'ontouchstart' in window,
      clipboard: !!navigator.clipboard
    }));
  },

  /**
   * Font testing helpers
   */
  async loadTestFont(page, fontPath) {
    await page.addInitScript((fontData) => {
      const font = new FontFace('TestFont', fontData);
      document.fonts.add(font);
    }, fontPath);
  },

  async verifyFontRendering(page, expectedText) {
    const canvas = await page.locator('canvas').first();
    const screenshot = await canvas.screenshot();
    // Return screenshot for comparison
    return screenshot;
  },

  /**
   * Mobile testing helpers
   */
  async simulateTouchGesture(page, gesture, element) {
    const elementHandle = await page.locator(element);
    const box = await elementHandle.boundingBox();
    
    switch (gesture) {
      case 'tap':
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        break;
      case 'longPress':
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2, { 
          button: 'left', 
          delay: 1000 
        });
        break;
      case 'swipe':
        await page.touchscreen.swipe(
          { x: box.x, y: box.y + box.height / 2 },
          { x: box.x + box.width, y: box.y + box.height / 2 }
        );
        break;
    }
  },

  /**
   * Accessibility testing helpers
   */
  async checkAccessibility(page) {
    // Inject axe-core for accessibility testing
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
    });
    
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run(document, (err, results) => {
          resolve(results);
        });
      });
    });
    
    return results;
  },

  /**
   * Visual regression helpers
   */
  async takeScreenshot(page, name, options = {}) {
    return await page.screenshot({
      path: `app/web/__tests__/fixtures/screenshots/${name}.png`,
      fullPage: true,
      ...options
    });
  },

  async compareScreenshot(page, baselinePath, options = {}) {
    const screenshot = await page.screenshot(options);
    // Compare with baseline - would integrate with visual regression tool
    return { match: true, diff: null }; // Placeholder
  },

  /**
   * Network and offline testing helpers
   */
  async goOffline(page) {
    await page.context().setOffline(true);
  },

  async goOnline(page) {
    await page.context().setOffline(false);
  },

  async mockNetworkResponse(page, url, response) {
    await page.route(url, route => {
      route.fulfill({
        status: response.status || 200,
        contentType: response.contentType || 'application/json',
        body: JSON.stringify(response.body)
      });
    });
  },

  /**
   * Error simulation helpers
   */
  async simulateError(page, errorType) {
    switch (errorType) {
      case 'networkError':
        await page.route('**/*', route => route.abort());
        break;
      case 'jsError':
        await page.addInitScript(() => {
          window.addEventListener('load', () => {
            throw new Error('Simulated JavaScript error');
          });
        });
        break;
      case 'fontLoadError':
        await page.route('**/fonts/**', route => route.abort());
        break;
    }
  }
};

export const waitForCondition = async (page, condition, timeout = 5000) => {
  return await page.waitForFunction(condition, {}, { timeout });
};

export const mockFileSystemAPI = async (page, mockImplementation = {}) => {
  await page.addInitScript((mockImpl) => {
    // Mock File System Access API for browsers that don't support it
    if (!window.showOpenFilePicker) {
      window.showOpenFilePicker = mockImpl.showOpenFilePicker || (() => {
        throw new Error('File System Access API not supported');
      });
    }
    
    if (!window.showSaveFilePicker) {
      window.showSaveFilePicker = mockImpl.showSaveFilePicker || (() => {
        throw new Error('File System Access API not supported');
      });
    }
  }, mockImplementation);
};