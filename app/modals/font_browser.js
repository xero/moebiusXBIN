const { ipcRenderer } = require('electron');
const { Font } = require('../libtextmode/font.js');

let selectedFont = null;
let fontLists = {};
let loadedPreviews = new Map();

// We'll display the font as a character grid (16x16 = 256 characters)

async function initializeFontBrowser() {
    try {
        // Get font lists from main process
        fontLists = await ipcRenderer.invoke('get-font-lists');
        
        if (!fontLists || (!fontLists.standard && !fontLists.viler && !fontLists.custom)) {
            console.error('Failed to load font lists');
            return;
        }
        
        populateFontList();
        selectFirstFont();
        
    } catch (error) {
        console.error('Error initializing font browser:', error);
    }
}

function populateFontList() {
    const fontListElement = document.getElementById('fontList');
    fontListElement.innerHTML = '';
    
    // Add standard fonts
    if (fontLists.standard) {
        Object.keys(fontLists.standard).forEach(categoryName => {
            const categoryDiv = createFontCategory(categoryName, fontLists.standard[categoryName]);
            fontListElement.appendChild(categoryDiv);
        });
    }
    
    // Add Viler's fonts
    if (fontLists.viler) {
        Object.keys(fontLists.viler).forEach(categoryName => {
            const categoryDiv = createFontCategory(`Viler's ${categoryName}`, fontLists.viler[categoryName]);
            fontListElement.appendChild(categoryDiv);
        });
    }

    // Add custom fonts
    if (fontLists.custom) {
        Object.keys(fontLists.custom).forEach(categoryName => {
            const categoryDiv = createFontCategory(`${categoryName}`, fontLists.custom[categoryName]);
            fontListElement.appendChild(categoryDiv);
        });
    }
}

function createFontCategory(categoryName, fonts) {
    const detailsElement = document.createElement('details');
    detailsElement.className = 'font-category';
    detailsElement.open = true; // Start expanded
    
    const summaryElement = document.createElement('summary');
    summaryElement.className = 'category-header';
    summaryElement.textContent = categoryName;
    
    Object.keys(fonts).forEach(fontName => {
        const fontHeight = fonts[fontName];
        const fontItem = document.createElement('div');
        fontItem.className = 'font-item';
        fontItem.textContent = `${fontName} (8×${fontHeight})`;
        fontItem.dataset.fontName = fontName;
        fontItem.tabIndex = 0; // Make focusable
        fontItem.onclick = () => selectFont(fontName, fontItem);
        fontItem.onkeydown = (e) => handleFontItemKeydown(e, fontName, fontItem);
        detailsElement.appendChild(fontItem);
    });
    
    detailsElement.insertBefore(summaryElement, detailsElement.firstChild);
    
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

function generateFontPreview(font) {
    try {
        if (!font.canvas) {
            throw new Error('Font canvas is not available');
        }
        
        // Create canvas for 16x16 character grid (like charlist)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size: 16 characters wide × 16 characters tall
        canvas.width = font.width * 16;
        canvas.height = font.height * 16;
        
        // Draw all 256 characters in a 16x16 grid
        for (let y = 0, code = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++, code++) {
                // Draw character using font's draw method (similar to charlist)
                // We need foreground and background colors
                const fg = 15; // White foreground
                const bg = 0;  // Black background
                
                try {
                    font.draw(ctx, { code, fg, bg }, x * font.width, y * font.height);
                } catch (drawError) {
                    console.warn('Error drawing character', code, ':', drawError);
                    // Fallback: draw from font canvas directly
                    ctx.drawImage(
                        font.canvas,
                        code * font.width, 0, font.width, font.height,  // Source
                        x * font.width, y * font.height, font.width, font.height  // Destination
                    );
                }
            }
        }
        
        const dataUrl = canvas.toDataURL();
        
        return {
            canvas: canvas,
            width: font.width,
            height: font.height,
            dataUrl: dataUrl
        };
    } catch (error) {
        console.error('Error in generateFontPreview:', error);
        throw error;
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
});

// Handle window close
window.addEventListener('beforeunload', () => {
    // Clean up any resources if needed
    loadedPreviews.clear();
});