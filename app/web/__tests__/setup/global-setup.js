// Global setup for Playwright tests
// app/web/__tests__/setup/global-setup.js

const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🚀 Setting up global test environment...');
  
  // Start services if not running
  if (!process.env.CI) {
    console.log('📦 Preparing test environment for local development...');
  }
  
  // Initialize test database or mock services if needed
  await setupTestDatabase();
  
  // Warm up the application
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🌡️  Warming up application...');
    await page.goto(config.use.baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Application warmed up successfully');
  } catch (error) {
    console.error('❌ Failed to warm up application:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed');
}

async function setupTestDatabase() {
  // Initialize IndexedDB test data if needed
  // Setup mock API responses
  // Prepare test fonts and assets
  console.log('📝 Test data prepared');
}

module.exports = globalSetup;