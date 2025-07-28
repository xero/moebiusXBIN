const { ipcRenderer } = require('electron');
const { Font, generateFontPreview } = require('../libtextmode/font.js');

let selectedFont = null;
let fontLists = {};
let loadedPreviews = new Map();
let favorites = new Set();
let livePreviewEnabled = false;
let sizeFilters = new Set();

// We'll display the font as a character grid (16x16 = 256 characters)

async function initializeFontBrowser() {
    try {
        // Load favorites from localStorage
        loadFavorites();
        
        // Get font lists from main process
        fontLists = await ipcRenderer.invoke('get-font-lists');
        
        if (!fontLists || (!fontLists.standard && !fontLists.viler && !fontLists.custom)) {
            console.error('Failed to load font lists');
            return;
        }
        
        populateSizeFilters();
        populateFontList();
        selectFirstFont();
        
    } catch (error) {
        console.error('Error initializing font browser:', error);
    }
}

function populateSizeFilters() {
    const sizeFilterElement = document.getElementById('sizeFilterOptions');
    sizeFilterElement.innerHTML = '';
    
    // Collect all unique font sizes
    const allSizes = new Set();
    
    [fontLists.standard, fontLists.viler, fontLists.custom].forEach(fontList => {
        if (fontList) {
            Object.values(fontList).forEach(category => {
                Object.values(category).forEach(size => {
                    if (typeof size === 'number') {
                        allSizes.add(size);
                    }
                });
            });
        }
    });
    
    // Sort sizes numerically
    const sortedSizes = Array.from(allSizes).sort((a, b) => a - b);
    
    // Create checkboxes for each size
    sortedSizes.forEach(size => {
        const sizeOption = document.createElement('label');
        sizeOption.className = 'size-option';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = size.toString();
        checkbox.checked = true; // All sizes selected by default
        checkbox.addEventListener('change', handleSizeFilterChange);
        
        const label = document.createElement('span');
        label.textContent = `${size}px`;
        
        sizeOption.appendChild(checkbox);
        sizeOption.appendChild(label);
        sizeFilterElement.appendChild(sizeOption);
        
        sizeFilters.add(size);
    });
    
    // Add event listener for toggle all button
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', toggleAllSizes);
        updateToggleButtonText(); // Set initial button text
    }
}

function toggleAllSizes() {
    const checkboxes = document.querySelectorAll('#sizeFilterOptions input[type="checkbox"]');
    const checkedCount = document.querySelectorAll('#sizeFilterOptions input[type="checkbox"]:checked').length;
    
    if (checkedCount === 0) {
        // If none are checked, check all
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Rebuild size filters set
        sizeFilters.clear();
        checkboxes.forEach(checkbox => {
            sizeFilters.add(parseInt(checkbox.value));
        });
        
        // Update font list
        populateFontList();
        selectFirstFont();
        
    } else {
        // If any are checked, uncheck all
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Clear size filters
        sizeFilters.clear();
        
        // Update font list (will show no fonts since no sizes are selected)
        populateFontList();
        
        // Clear selection since no fonts are visible
        selectedFont = null;
        document.getElementById('loadFontBtn').disabled = true;
        document.getElementById('previewTitle').textContent = 'No fonts match the current filters';
        document.getElementById('previewInfo').textContent = '';
        document.getElementById('previewContent').innerHTML = '';
    }
    
    updateToggleButtonText();
}

function updateToggleButtonText() {
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    const checkedCount = document.querySelectorAll('#sizeFilterOptions input[type="checkbox"]:checked').length;
    
    if (toggleAllBtn) {
        toggleAllBtn.textContent = checkedCount === 0 ? 'Check all' : 'Uncheck all';
    }
}

function handleSizeFilterChange() {
    // Update sizeFilters set based on checked checkboxes
    sizeFilters.clear();
    
    document.querySelectorAll('#sizeFilterOptions input[type="checkbox"]:checked').forEach(checkbox => {
        sizeFilters.add(parseInt(checkbox.value));
    });
    
    // Repopulate font list with current filters
    populateFontList();
    
    // Reselect first font if current selection is filtered out
    if (selectedFont && !isFontVisible(selectedFont)) {
        selectFirstFont();
    }
    
    // Update toggle button text
    updateToggleButtonText();
}

function isFontVisible(fontName) {
    // Check if font matches current size filters
    const fontSize = getFontSize(fontName);
    return fontSize !== null && sizeFilters.has(fontSize);
}

function getFontSize(fontName) {
    // Search for font size in all font lists
    const searchInList = (fontList) => {
        if (!fontList) return null;
        
        for (const category of Object.values(fontList)) {
            if (category[fontName] !== undefined) {
                return category[fontName];
            }
        }
        return null;
    };
    
    return searchInList(fontLists.standard) || 
           searchInList(fontLists.viler) || 
           searchInList(fontLists.custom);
}

function populateFontList() {
    const fontListElement = document.getElementById('fontList');
    fontListElement.innerHTML = '';
    
    // Add favorites category first if we have any
    if (favorites.size > 0) {
        const favoritesFonts = {};
        // Collect all favorite fonts from all categories
        [fontLists.standard, fontLists.viler, fontLists.custom].forEach(fontList => {
            if (fontList) {
                Object.keys(fontList).forEach(categoryName => {
                    Object.keys(fontList[categoryName]).forEach(fontName => {
                        if (favorites.has(fontName)) {
                            favoritesFonts[fontName] = fontList[categoryName][fontName];
                        }
                    });
                });
            }
        });
        
        if (Object.keys(favoritesFonts).length > 0) {
            const favoritesCategory = createFontCategory('★ Favorites', favoritesFonts, true);
            if (favoritesCategory) {
                fontListElement.appendChild(favoritesCategory);
            }
        }
    }
    
    // Add standard fonts
    if (fontLists.standard) {
        Object.keys(fontLists.standard).forEach(categoryName => {
            const categoryDiv = createFontCategory(categoryName, fontLists.standard[categoryName]);
            if (categoryDiv) {
                fontListElement.appendChild(categoryDiv);
            }
        });
    }
    
    // Add Viler's fonts
    if (fontLists.viler) {
        Object.keys(fontLists.viler).forEach(categoryName => {
            const categoryDiv = createFontCategory(`Viler's ${categoryName}`, fontLists.viler[categoryName]);
            if (categoryDiv) {
                fontListElement.appendChild(categoryDiv);
            }
        });
    }

    // Add custom fonts
    if (fontLists.custom) {
        Object.keys(fontLists.custom).forEach(categoryName => {
            const categoryDiv = createFontCategory(`${categoryName}`, fontLists.custom[categoryName]);
            if (categoryDiv) {
                fontListElement.appendChild(categoryDiv);
            }
        });
    }
}

function createFontCategory(categoryName, fonts, isFavoritesCategory = false) {
    const detailsElement = document.createElement('details');
    detailsElement.className = 'font-category';
    detailsElement.open = true; // Start expanded
    
    const summaryElement = document.createElement('summary');
    summaryElement.className = 'category-header';
    summaryElement.textContent = categoryName;
    
    let hasVisibleFonts = false;
    
    Object.keys(fonts).forEach(fontName => {
        // Apply size filtering
        if (!isFontVisible(fontName)) {
            return; // Skip this font if it doesn't match size filters
        }
        
        hasVisibleFonts = true;
        
        const fontItem = document.createElement('div');
        fontItem.className = 'font-item';
        fontItem.dataset.fontName = fontName;
        fontItem.tabIndex = 0; // Make focusable
        
        // Create font name span
        const fontNameSpan = document.createElement('span');
        fontNameSpan.className = 'font-name';
        fontNameSpan.textContent = `${fontName}`;
        
        // Create star button
        const starButton = document.createElement('button');
        starButton.className = favorites.has(fontName) ? 'star-button favorited' : 'star-button';
        starButton.innerHTML = favorites.has(fontName) ? '★' : '☆';
        starButton.title = favorites.has(fontName) ? 'Remove from favorites' : 'Add to favorites';
        starButton.onclick = (e) => {
            e.stopPropagation();
            toggleFavorite(fontName);
        };
        
        fontItem.appendChild(fontNameSpan);
        fontItem.appendChild(starButton);
        
        fontItem.onclick = () => selectFont(fontName, fontItem);
        fontItem.onkeydown = (e) => handleFontItemKeydown(e, fontName, fontItem);
        detailsElement.appendChild(fontItem);
    });
    
    detailsElement.insertBefore(summaryElement, detailsElement.firstChild);
    
    // Only return the category if it has visible fonts
    if (!hasVisibleFonts) {
        return null;
    }
    
    return detailsElement;
}

async function selectFont(fontName, fontElement) {
    // Update UI selection
    document.querySelectorAll('.font-item').forEach(item => {
        item.classList.remove('selected');
    });
    fontElement.classList.add('selected');
    selectedFont = fontName;
    document.getElementById('loadFontBtn').disabled = false;
    
    // Update preview header
    document.getElementById('previewTitle').textContent = fontName;
    document.getElementById('previewInfo').textContent = 'Loading preview...';
    
    // Load and display font preview
    await loadFontPreview(fontName);
    
    // If live preview is enabled, apply font to main canvas
    if (livePreviewEnabled) {
        ipcRenderer.send('font-browser-live-preview', fontName);
    }
}

async function loadFontPreview(fontName) {
    try {        
        // Check if preview is already cached
        if (loadedPreviews.has(fontName)) {
            displayFontPreview(fontName, loadedPreviews.get(fontName));
            return;
        }
        
        // Load font
        const font = new Font();
        await font.load({ name: fontName });
        
        // Generate preview data
        
        const previewData = generateFontPreview(font);
        loadedPreviews.set(fontName, previewData);
        
        displayFontPreview(fontName, previewData);
        
        
    } catch (error) {
        console.error('Error loading font preview for', fontName, ':', error);
        console.error('Error stack:', error.stack);
        document.getElementById('previewInfo').textContent = `Error: ${error.message}`;
        document.getElementById('previewContent').innerHTML = `Failed to load font preview: ${error.message}`;
    }
}



function displayFontPreview(fontName, previewData) {
    const previewContent = document.getElementById('previewContent');
    const previewInfo = document.getElementById('previewInfo');
    
    // Update info
    previewInfo.textContent = `Size: ${previewData.width}×${previewData.height} pixels`;
    
    // Display preview
    previewContent.innerHTML = '';
    const img = document.createElement('img');
    img.src = previewData.dataUrl;
    
    previewContent.appendChild(img);
}

function send(channel, opts) {
    ipcRenderer.send(channel, {id: require('electron').remote.getCurrentWindow().getParentWindow().id, ...opts});
}

function loadSelectedFont() {
    if (selectedFont) {
        // Send font selection back to main window
        ipcRenderer.send('font-browser-selection', selectedFont);
        closeModal();
    }
}

function closeModal() {
    send('close_modal');
}

function handleFontItemKeydown(e, fontName, fontElement) {
    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            navigateUp(fontElement);
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateDown(fontElement);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            navigateLeft(fontElement);
            break;
        case 'ArrowRight':
            e.preventDefault();
            navigateToNextCategory();
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            selectFont(fontName, fontElement);
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFavorite(fontName);
            break;
    }
}

function navigateUp(currentElement) {
    const allItems = getAllNavigableItems();
    const currentIndex = allItems.indexOf(currentElement);
    
    if (currentIndex > 0) {
        const nextElement = allItems[currentIndex - 1];
        focusElement(nextElement);
    }
}

function navigateDown(currentElement) {
    const allItems = getAllNavigableItems();
    const currentIndex = allItems.indexOf(currentElement);
    
    if (currentIndex < allItems.length - 1) {
        const nextElement = allItems[currentIndex + 1];
        focusElement(nextElement);
    }
}

function navigateLeft(currentElement) {
    if (currentElement.classList.contains('font-item')) {
        // If current element is a font item, go to its category header
        const categoryHeader = currentElement.closest('.font-category')?.querySelector('summary');
        if (categoryHeader) {
            focusElement(categoryHeader);
        }
    } else {
        // If current element is a category header, go to previous category
        navigateToPreviousCategory();
    }
}

function navigateToPreviousCategory() {
    const categories = document.querySelectorAll('.font-category summary');
    const currentFocus = document.activeElement;
    
    // Find current category
    let currentCategory = null;
    if (currentFocus.tagName === 'SUMMARY') {
        currentCategory = currentFocus;
    } else {
        currentCategory = currentFocus.closest('.font-category')?.querySelector('summary');
    }
    
    if (currentCategory) {
        const categoryArray = Array.from(categories);
        const currentIndex = categoryArray.indexOf(currentCategory);
        
        if (currentIndex > 0) {
            const prevCategory = categoryArray[currentIndex - 1];
            focusElement(prevCategory);
        }
    }
}

function navigateToNextCategory() {
    const categories = document.querySelectorAll('.font-category summary');
    const currentFocus = document.activeElement;
    
    // Find current category
    let currentCategory = null;
    if (currentFocus.tagName === 'SUMMARY') {
        currentCategory = currentFocus;
    } else {
        currentCategory = currentFocus.closest('.font-category')?.querySelector('summary');
    }
    
    if (currentCategory) {
        const categoryArray = Array.from(categories);
        const currentIndex = categoryArray.indexOf(currentCategory);
        
        if (currentIndex < categoryArray.length - 1) {
            const nextCategory = categoryArray[currentIndex + 1];
            focusElement(nextCategory);
        }
    }
}

function getAllNavigableItems() {
    const allItems = [];
    const categories = document.querySelectorAll('.font-category');
    
    categories.forEach(category => {
        // Add category header
        const summary = category.querySelector('summary');
        if (summary) {
            allItems.push(summary);
        }
        
        // Add font items if category is open
        if (category.open) {
            const fontItems = category.querySelectorAll('.font-item');
            allItems.push(...fontItems);
        }
    });
    
    return allItems;
}

function focusElement(element) {
    element.focus();
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
    
    // If it's a font item, trigger selection
    if (element.classList.contains('font-item')) {
        const fontName = element.dataset.fontName;
        if (fontName) {
            selectFont(fontName, element);
        }
    }
}

function selectFirstFont() {
    const allFontItems = document.querySelectorAll('.font-item');
    if (allFontItems.length > 0) {
        const firstFont = allFontItems[0];
        
        // Make sure the category is expanded
        const category = firstFont.closest('.font-category');
        if (category) {
            category.open = true;
        }
        
        // Focus and select the font
        focusElement(firstFont);
    }
}

// Add global keyboard handler for the font list
function setupKeyboardNavigation() {
    const fontList = document.getElementById('fontList');
    
    fontList.addEventListener('keydown', (e) => {
        // Handle navigation when focus is on summary elements
        if (e.target.tagName === 'SUMMARY') {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    navigateUp(e.target);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    navigateDown(e.target);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    navigateLeft(e.target);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    navigateToNextCategory();
                    break;
                case 'Enter':
                    e.preventDefault();
                    // If we have a selected font, load it
                    if (selectedFont) {
                        loadSelectedFont();
                    }
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    // Toggle favorite for currently selected font
                    if (selectedFont) {
                        toggleFavorite(selectedFont);
                    }
                    break;
            }
        }
    });
    
    // Add global escape key handler
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'Escape':
                e.preventDefault();
                closeModal();
                break;
            case 'Enter':
                // Handle Enter globally - load selected font if we have one
                if (selectedFont && !e.target.closest('.buttons')) {
                    e.preventDefault();
                    loadSelectedFont();
                }
                break;
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeFontBrowser();
    setupKeyboardNavigation();
    setupLivePreview();
    // Uncomment to enable debug menu
    // require('electron').remote.getCurrentWindow().webContents.openDevTools();
});

// Favorites management functions
function loadFavorites() {
    try {
        const savedFavorites = localStorage.getItem('fontBrowserFavorites');
        if (savedFavorites) {
            favorites = new Set(JSON.parse(savedFavorites));
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = new Set();
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('fontBrowserFavorites', JSON.stringify([...favorites]));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

function toggleFavorite(fontName) {
    if (favorites.has(fontName)) {
        favorites.delete(fontName);
    } else {
        favorites.add(fontName);
    }
    
    saveFavorites();
    
    // Store the current focus/selection state
    const currentlyFocusedElement = document.activeElement;
    const currentlySelectedFont = selectedFont;
    
    // Update all star buttons for this font
    document.querySelectorAll(`[data-font-name="${fontName}"] .star-button`).forEach(button => {
        button.innerHTML = favorites.has(fontName) ? '★' : '☆';
        button.title = favorites.has(fontName) ? 'Remove from favorites' : 'Add to favorites';
        button.className = favorites.has(fontName) ? 'star-button favorited' : 'star-button';
    });
    
    // Refresh the font list to show/hide favorites category
    populateFontList();
    
    // Restore selection to the same font in the same context (not jumping to favorites)
    if (currentlySelectedFont) {
        // Try to find the font element that was originally focused
        let targetElement = null;
        
        // If we were focused on a font in the favorites category and it's still favorited,
        // or if we were in a regular category, prefer the regular category version
        const allMatching = document.querySelectorAll(`[data-font-name="${currentlySelectedFont}"]`);
        
        if (allMatching.length > 0) {
            // If there are multiple instances (favorites + original), prefer non-favorites unless
            // the user was specifically in the favorites category
            if (allMatching.length > 1 && (!currentlyFocusedElement || 
                !currentlyFocusedElement.closest('.font-category')?.querySelector('.category-header')?.textContent?.includes('★'))) {
                // Find the non-favorites version (skip the first one which would be favorites)
                targetElement = allMatching[1];
            } else {
                // Use the first available instance
                targetElement = allMatching[0];
            }
        }
        
        if (targetElement) {
            selectFont(currentlySelectedFont, targetElement);
            targetElement.focus();
        }
    }
}

// Live preview functionality
function setupLivePreview() {
    const checkbox = document.getElementById('livePreviewCheckbox');
    if (checkbox) {
        // Load saved preference
        const saved = localStorage.getItem('fontBrowserLivePreview');
        livePreviewEnabled = saved === 'true';
        checkbox.checked = livePreviewEnabled;
        
        checkbox.addEventListener('change', (e) => {
            livePreviewEnabled = e.target.checked;
            localStorage.setItem('fontBrowserLivePreview', livePreviewEnabled.toString());
            
            // If enabled and we have a selected font, apply it immediately
            if (livePreviewEnabled && selectedFont) {
                ipcRenderer.send('font-browser-live-preview', selectedFont);
            }
        });
    }
}

// Handle window close
window.addEventListener('beforeunload', () => {
    // Clean up any resources if needed
    loadedPreviews.clear();
});