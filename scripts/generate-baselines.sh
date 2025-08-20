#!/bin/bash
# MoebiusXBIN Visual Regression Baseline Generation Script
# 
# This script generates clean, consistent visual regression baselines
# for cross-browser testing. Run this when UI changes are intentional
# and new baselines need to be established.

set -e

echo "🎯 MoebiusXBIN Visual Baseline Generation"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "app/web" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo "It's recommended to commit or stash changes before generating baselines"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci --silent

echo -e "${BLUE}🏗️  Building application...${NC}"
npm run build:web --silent

echo -e "${BLUE}🧹 Cleaning previous test artifacts...${NC}"
rm -rf test-results/
rm -rf app/web/__tests__/fixtures/screenshots/actual/
rm -rf app/web/__tests__/fixtures/screenshots/diff/

# Create screenshots directory structure if it doesn't exist
mkdir -p app/web/__tests__/fixtures/screenshots/{baseline,actual,diff}/{chromium,firefox,webkit}

echo -e "${BLUE}📸 Generating visual regression baselines...${NC}"
echo "This may take a few minutes..."

# Set environment variable to update snapshots
export PLAYWRIGHT_UPDATE_SNAPSHOTS=1

# Run visual regression tests to generate baselines
npx playwright test visual/ --project=visual-regression --reporter=line

# Check if baselines were generated successfully
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Baselines generated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to generate baselines${NC}"
    exit 1
fi

# Count generated screenshots
baseline_count=$(find app/web/__tests__/fixtures/screenshots/baseline -name "*.png" | wc -l)
echo -e "${GREEN}📊 Generated ${baseline_count} baseline screenshots${NC}"

echo
echo -e "${YELLOW}🔍 BASELINE REVIEW CHECKLIST${NC}"
echo "Before committing these baselines, please verify:"
echo "  □ All expected UI elements are visible"
echo "  □ Fonts loaded correctly (no fallback fonts)"
echo "  □ Colors display accurately"
echo "  □ No unexpected scrollbars or clipping"
echo "  □ Layout is stable and consistent"
echo "  □ No dynamic content (timestamps, session IDs) visible"
echo

echo -e "${BLUE}📂 View generated baselines:${NC}"
echo "  Open: app/web/__tests__/fixtures/screenshots/baseline/"
echo

echo -e "${YELLOW}🔄 Next steps:${NC}"
echo "  1. Review all generated screenshots carefully"
echo "  2. If satisfied, commit the baseline images:"
echo "     git add app/web/__tests__/fixtures/screenshots/baseline/"
echo "     git commit -m \"Update visual regression baselines\""
echo "  3. Run visual tests to verify baselines work:"
echo "     npm run test:visual"
echo

echo -e "${GREEN}✨ Baseline generation complete!${NC}"