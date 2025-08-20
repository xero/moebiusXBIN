# Visual Regression Screenshots

This directory contains screenshot baselines and test artifacts for visual regression testing.

## Directory Structure

```
screenshots/
├── baseline/           # Reference screenshots (committed to git)
│   ├── chromium/      # Chrome/Chromium baseline images
│   ├── firefox/       # Firefox baseline images
│   └── webkit/        # Safari/WebKit baseline images
├── actual/            # Screenshots from test runs (not committed)
│   ├── chromium/
│   ├── firefox/
│   └── webkit/
├── diff/              # Difference images when tests fail (not committed)
│   ├── chromium/
│   ├── firefox/
│   └── webkit/
└── docs/              # Documentation about baseline management
```

## Baseline Management

### Creating New Baselines

Use the baseline generation script to create clean, consistent baselines:

```bash
npm run test:baselines
```

This script:
1. Ensures a clean environment
2. Builds the application
3. Runs visual tests with snapshot updates
4. Creates screenshots in standardized conditions

### Reviewing Baselines

Before committing new baselines, verify:

- [ ] All expected UI elements are visible
- [ ] Fonts loaded correctly (no fallback fonts)
- [ ] Colors display accurately
- [ ] No unexpected scrollbars or clipping
- [ ] Layout is stable and consistent
- [ ] No dynamic content (timestamps, session IDs) visible

### Updating Specific Screenshots

To update specific screenshots after intentional changes:

```bash
# Update all screenshots
npx playwright test --update-snapshots

# Update specific test
npx playwright test visual-regression.spec.js --update-snapshots

# Update for specific browser
npx playwright test --project=visual-regression --update-snapshots
```

## Common Issues

### Font Loading Variations
- Ensure fonts are fully loaded before capturing
- Use `document.fonts.ready` to wait for font loading
- Consider browser-specific font rendering differences

### Animation Timing
- Disable animations in CSS for consistent captures
- Wait for animations to complete before screenshots
- Use fixed timing for dynamic content

### Dynamic Content
- Hide or mask elements that change between runs
- Use data attributes for consistent element selection
- Set fixed dates/times for test environments

### Browser Differences
- Accept minor rendering differences between browsers
- Use appropriate threshold values for comparisons
- Document known acceptable differences

## Maintenance Schedule

### Weekly
- Review any visual test failures
- Update baselines for intentional changes only

### Monthly
- Clean up old actual/diff images
- Review baseline quality and consistency
- Update this documentation as needed

### Quarterly
- Full baseline review across all browsers
- Update browser-specific baseline sets
- Review and update masking strategies

---

*Note: Only baseline images should be committed to git. The actual/ and diff/ directories are for local testing and CI artifacts only.*