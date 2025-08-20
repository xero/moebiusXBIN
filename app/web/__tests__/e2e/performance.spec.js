// Performance testing suite
// app/web/__tests__/e2e/performance.spec.js

const { test, expect } = require('@playwright/test');
const { testHelpers } = require('../setup/test-helpers');

test.describe('Performance Tests', () => {
  test('should load within performance budget', async ({ page }) => {
    const loadTime = await testHelpers.measurePageLoad(page, '/');
    
    // Performance budget: 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Verify Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.lcp = entries[entries.length - 1]?.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries[0]?.startTime;
        }).observe({ entryTypes: ['paint'] });
        
        // First Input Delay will be measured during interaction
        setTimeout(() => resolve(vitals), 1000);
      });
    });
    
    expect(vitals.lcp).toBeLessThan(2500); // Good LCP threshold
    expect(vitals.fcp).toBeLessThan(1800); // Good FCP threshold
  });

  test('should respond to input within 100ms', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Measure input response time
    const responseTime = await testHelpers.measurePerformance(page, async () => {
      await canvas.click();
      await page.keyboard.type('A');
      // Wait for character to appear
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-testid="canvas"]');
        return canvas && canvas.textContent.includes('A');
      });
    });
    
    expect(responseTime).toBeLessThan(100);
  });

  test('should handle large documents efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Create large document
    await page.click('[data-testid="new-document"]');
    await page.selectOption('[data-testid="canvas-width"]', '200');
    await page.selectOption('[data-testid="canvas-height"]', '100');
    await page.click('[data-testid="create-document"]');
    
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Fill document with content
    const fillTime = await testHelpers.measurePerformance(page, async () => {
      for (let i = 0; i < 100; i++) {
        await canvas.click({ position: { x: 10 + (i % 10) * 10, y: 10 + Math.floor(i / 10) * 10 } });
        await page.keyboard.type('X');
      }
    });
    
    // Should complete within reasonable time
    expect(fillTime).toBeLessThan(10000); // 10 seconds for 100 characters
    
    // Verify scrolling performance
    const scrollTime = await testHelpers.measurePerformance(page, async () => {
      await page.keyboard.press('PageDown');
      await page.keyboard.press('PageDown');
      await page.keyboard.press('PageUp');
      await page.keyboard.press('PageUp');
    });
    
    expect(scrollTime).toBeLessThan(1000);
  });

  test('should manage memory efficiently during extended use', async ({ page }) => {
    await page.goto('/');
    
    // Simulate extended use session
    for (let session = 0; session < 5; session++) {
      // Create document
      await page.click('[data-testid="new-document"]');
      await page.click('[data-testid="create-document"]');
      
      // Add content
      const canvas = page.locator('[data-testid="canvas"]');
      await canvas.click();
      await page.keyboard.type(`Session ${session} content`);
      
      // Perform operations
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Control+C');
      await page.keyboard.press('Control+V');
      
      // Close document
      await page.keyboard.press('Control+W');
    }
    
    // Check memory usage
    const memoryInfo = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      // Memory usage should not exceed 100MB
      expect(memoryInfo.used).toBeLessThan(100 * 1024 * 1024);
    }
  });

  test('should load fonts efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Open font browser
    await page.click('[data-testid="fonts-menu"]');
    
    const fontLoadTime = await testHelpers.measurePerformance(page, async () => {
      await page.click('[data-testid="font-browser"]');
      await page.waitForSelector('[data-testid="font-list"] [data-testid="font-item"]:nth-child(10)');
    });
    
    // Font browser should load within 1 second
    expect(fontLoadTime).toBeLessThan(1000);
    
    // Test font switching performance
    const fontSwitchTime = await testHelpers.measurePerformance(page, async () => {
      await page.click('[data-testid="font-item"]:first-child');
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-testid="canvas"]');
        return canvas && canvas.dataset.fontLoaded === 'true';
      });
    });
    
    expect(fontSwitchTime).toBeLessThan(500);
  });

  test('should handle file operations efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Test file opening performance
    const fileOpenTime = await testHelpers.measurePerformance(page, async () => {
      await page.click('[data-testid="open-file"]');
      await testHelpers.uploadFile(page, './app/web/__tests__/fixtures/large-document.ans');
      await page.waitForSelector('[data-testid="document-content"]');
    });
    
    expect(fileOpenTime).toBeLessThan(3000);
    
    // Test save performance
    const canvas = page.locator('[data-testid="canvas"]');
    await canvas.click();
    await page.keyboard.type('Modified content');
    
    const saveTime = await testHelpers.measurePerformance(page, async () => {
      await page.keyboard.press('Control+S');
      await page.fill('[data-testid="filename-input"]', 'performance-test.ans');
      await page.click('[data-testid="save-button"]');
      await page.waitForSelector('[data-testid="save-success"]');
    });
    
    expect(saveTime).toBeLessThan(2000);
  });

  test('should maintain performance across different browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Canvas rendering performance test
    const canvas = page.locator('[data-testid="canvas"]');
    
    const renderTime = await testHelpers.measurePerformance(page, async () => {
      // Draw a complex pattern
      for (let i = 0; i < 50; i++) {
        await canvas.click({ position: { x: 10 + i, y: 10 + i } });
        await page.keyboard.type('█');
      }
    });
    
    // Different browsers may have different performance characteristics
    const browserThresholds = {
      chromium: 5000,
      firefox: 6000,
      webkit: 7000
    };
    
    expect(renderTime).toBeLessThan(browserThresholds[browserName] || 6000);
  });

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Simulate concurrent operations
    const promises = [];
    
    // Start multiple operations simultaneously
    promises.push(
      page.click('[data-testid="new-document"]'),
      page.click('[data-testid="fonts-menu"]'),
      page.click('[data-testid="colors-menu"]'),
      page.click('[data-testid="tools-menu"]')
    );
    
    const concurrentTime = await testHelpers.measurePerformance(page, async () => {
      await Promise.all(promises);
      
      // Wait for all operations to complete
      await page.waitForSelector('[data-testid="new-document-dialog"]');
      await page.waitForSelector('[data-testid="fonts-menu"].expanded');
      await page.waitForSelector('[data-testid="colors-menu"].expanded');
      await page.waitForSelector('[data-testid="tools-menu"].expanded');
    });
    
    // Concurrent operations should not significantly degrade performance
    expect(concurrentTime).toBeLessThan(3000);
  });
});

test.describe('Mobile Performance Tests', () => {
  test('should perform well on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');
    
    await page.goto('/');
    
    // Test touch response time
    const touchResponseTime = await testHelpers.measurePerformance(page, async () => {
      await testHelpers.simulateTouchGesture(page, 'tap', '[data-testid="canvas"]');
      await page.keyboard.type('A');
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-testid="canvas"]');
        return canvas && canvas.textContent.includes('A');
      });
    });
    
    // Mobile should respond within 150ms (slightly higher than desktop)
    expect(touchResponseTime).toBeLessThan(150);
    
    // Test scroll performance
    const scrollTime = await testHelpers.measurePerformance(page, async () => {
      await testHelpers.simulateTouchGesture(page, 'swipe', '[data-testid="canvas"]');
      await page.waitForTimeout(500); // Wait for scroll animation
    });
    
    expect(scrollTime).toBeLessThan(1000);
  });

  test('should handle orientation changes efficiently', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');
    
    await page.goto('/');
    
    // Portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    
    // Landscape mode
    const orientationChangeTime = await testHelpers.measurePerformance(page, async () => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForSelector('[data-testid="landscape-layout"]');
    });
    
    expect(orientationChangeTime).toBeLessThan(1000);
  });
});

test.describe('Performance Regression Tests', () => {
  test('should not degrade performance compared to baseline', async ({ page }) => {
    // This test would compare current performance to stored baseline metrics
    await page.goto('/');
    
    const currentMetrics = await page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      };
    });
    
    // Compare with baseline (these would be stored values from previous runs)
    const baseline = {
      loadTime: 1500,
      domContentLoaded: 1000,
      firstPaint: 800
    };
    
    // Allow 10% degradation
    expect(currentMetrics.loadTime).toBeLessThan(baseline.loadTime * 1.1);
    expect(currentMetrics.domContentLoaded).toBeLessThan(baseline.domContentLoaded * 1.1);
    expect(currentMetrics.firstPaint).toBeLessThan(baseline.firstPaint * 1.1);
  });
});