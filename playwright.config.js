// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

/**
 * MoebiusXBIN Cross-Browser Testing Configuration
 * Optimized for web application testing across Chrome, Firefox, Safari, and Edge
 */
module.exports = defineConfig({
  testDir: './app/web/__tests__/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results.xml' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Global test timeout */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.file.createInChild': true,
            'dom.serviceWorkers.enabled': true
          }
        }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Safari-specific settings
      },
    },

    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        // Edge-specific settings
        channel: 'msedge'
      },
    },

    /* Visual regression testing project */
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        // Standardized settings for consistent screenshots
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        locale: 'en-US',
        timezone: 'UTC',
        // Disable animations for consistent captures
        reducedMotion: 'reduce',
        // Force consistent font rendering
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9'
        }
      },
      testMatch: '**/visual/*.spec.js'
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Tablet testing */
    {
      name: 'Tablet Chrome',
      use: { ...devices['iPad Pro'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run start:web',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Global setup and teardown */
  globalSetup: './app/web/__tests__/setup/global-setup.js',
  globalTeardown: './app/web/__tests__/setup/global-teardown.js',

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
});