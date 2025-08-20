# MoebiusXBIN Testing Quick Start Guide

This guide provides quick commands and examples for running the automated browser testing suite.

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run test:install
```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests (unit + e2e)
npm run test:e2e           # Run only end-to-end tests
npm run test:unit          # Run only unit tests
```

### Browser-Specific Tests
```bash
npm run test:chrome        # Chrome/Chromium only
npm run test:firefox       # Firefox only
npm run test:safari        # Safari/WebKit only
npm run test:edge          # Edge only
npm run test:mobile        # Mobile browsers
```

### Test Categories
```bash
npm run test:critical      # Critical functionality tests
npm run test:performance   # Performance tests
npm run test:visual        # Visual regression tests
npm run test:accessibility # Accessibility tests
```

### Debug Mode
```bash
npm run test:debug         # Run tests in debug mode
npm run test:headed        # Run tests with browser UI visible
```

### Visual Regression Testing
```bash
npm run test:visual        # Run visual regression tests
npm run test:baselines     # Generate new visual baselines
npx playwright test --update-snapshots  # Update specific screenshots
```

### Manual Testing
```bash
npm run test:manual        # View manual testing checklist
```

### View Results
```bash
npm run test:report        # Open test report in browser
```

## Test Structure

```
app/web/__tests__/
├── e2e/                           # End-to-end tests
│   ├── cross-browser.spec.js     # Browser compatibility
│   ├── user-workflows.spec.js    # User journey tests  
│   └── performance.spec.js       # Performance tests
├── unit/                          # Unit tests (Jest)
├── integration/                   # Integration tests
├── setup/                         # Test configuration
│   ├── global-setup.js          # Playwright setup
│   ├── test-helpers.js          # Test utilities
│   └── jest-setup.js            # Jest configuration
└── fixtures/                      # Test data
    ├── sample-files/             # Test documents
    └── screenshots/              # Visual baselines
```

## Writing Tests

### Cross-Browser Test Example
```javascript
const { test, expect } = require('@playwright/test');

test('should work across browsers', async ({ page, browserName }) => {
  await page.goto('/');
  
  // Browser-specific behavior
  if (browserName === 'chromium') {
    // Chrome-specific test
  } else {
    // Fallback test
  }
  
  // Universal assertions
  await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
});
```

### Performance Test Example
```javascript
test('should load quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - start;
  
  expect(loadTime).toBeLessThan(2000);
});
```

### Mobile Test Example
```javascript
test('should work on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-specific test');
  
  await page.goto('/');
  await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
});
```

## CI/CD Integration

The testing pipeline runs automatically on:
- Push to main/develop branches
- Pull requests
- Scheduled nightly runs

View results in GitHub Actions or check the generated reports.

## Test Data

Use the provided fixtures for consistent testing:
- `sample.ans` - Standard ASCII art file
- `large-document.ans` - Performance testing
- `invalid.txt` - Error handling tests

## Browser Support Matrix

| Browser | Version | Platform | Status |
|---------|---------|----------|--------|
| Chrome  | 86+     | All      | ✅ Full |
| Firefox | 88+     | All      | ✅ Full |
| Safari  | 14+     | macOS    | ✅ Full |
| Edge    | 86+     | Windows  | ✅ Full |
| Mobile  | Latest  | iOS/Android | ✅ Basic |

## Troubleshooting

### Common Issues

1. **Tests timeout**: Increase timeout in `playwright.config.js`
2. **Browser not found**: Run `npm run test:install`
3. **Port conflicts**: Change port in `vite.config.js`
4. **Flaky tests**: Add proper wait conditions
5. **Visual regression failures**: Review diff images, update baselines if changes are intentional

### Debug Commands
```bash
# Run single test file
npx playwright test cross-browser.spec.js

# Run with specific browser
npx playwright test --project=firefox

# Generate trace for debugging
npx playwright test --trace=on

# Update screenshots
npx playwright test --update-snapshots

# Generate clean baselines
npm run test:baselines
```

## Manual Testing

In addition to automated tests, manual testing is essential for edge cases:

- **Exotic mobile browsers**: Samsung Internet, UC Browser, Opera Mobile
- **Real-world PWA installation**: Test installation flow on actual devices  
- **Accessibility edge cases**: Screen readers, high contrast mode, keyboard navigation
- **Network edge cases**: Slow connections, corporate proxies, intermittent connectivity

See `DOCS/MANUAL_TESTING_CHECKLIST.md` for detailed manual testing procedures.

## Visual Regression Baselines

### Managing Screenshot Baselines

1. **Generate new baselines**: `npm run test:baselines`
2. **Review before committing**: Check all screenshots in `app/web/__tests__/fixtures/screenshots/baseline/`
3. **Update specific screenshots**: `npx playwright test --update-snapshots`

### Baseline Review Checklist
- [ ] All expected UI elements visible
- [ ] Fonts loaded correctly (no fallback fonts)
- [ ] Colors display accurately  
- [ ] No unexpected scrollbars or clipping
- [ ] Layout is stable and consistent
- [ ] No dynamic content (timestamps, session IDs) visible

For detailed documentation, see `DOCS/AUTOMATED_BROWSER_TESTING_STRATEGY.md`.