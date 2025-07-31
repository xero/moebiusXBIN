const { ipcRenderer, shell } = require('electron');
const { lospec_palette } = require('../libtextmode/palette.js');

let selectedPalette = null;
let paletteNames = [];
let loadedPreviews = new Map();
let favorites = new Set();
let livePreviewEnabled = false;

async function initializePaletteBrowser() {
    try {
        // Load favorites from localStorage
        loadFavorites();
        
        // Get palette names from the lospec_palette function
        paletteNames = getPaletteNames();
        
        if (!paletteNames || paletteNames.length === 0) {
            console.error('No palettes found');
            return;
        }
        
        populatePaletteList();
        selectFirstPalette();
        
    } catch (error) {
        console.error('Error initializing palette browser:', error);
    }
}

function getPaletteNames() {
    // Get palette names by trying each one with the lospec_palette function
    const testNames = [
        "Default",
        "A.J.'s Pico-8 Palette",
        "A64",
        "AAP-16",
        "ADB hybrid 16",
        "AGC16",
        "AJMSX",
        "ANDREW KENSLER 16 (STYLIZED)",
        "Andrew Kensler 16",
        "Andrew Kensler's 16",
        "another retro",
        "antiquity16",
        "Arctic Level",
        "Arne 16",
        "ARQ16",
        "Astro16-v2",
        "Astron ST16",
        "Autumn",
        "Baby Jo in \"Going Home\"",
        "Bloom 16",
        "BoldSouls16",
        "Bounce-16",
        "BPRD-16",
        "Brenyon's Rainbow",
        "Bubblegum 16",
        "Campbell (New Windows Console)",
        "Cartooners",
        "Castpixel 16",
        "CD-BAC",
        "CGArne",
        "Chip's Challenge Amiga/Atari ST",
        "Chip16",
        "Chromatic16",
        "cm16",
        "Colodore VIC-64",
        "Colodore",
        "Color Graphics Adapter",
        "Colorbit-16",
        "Colorblind 16",
        "colorquest (retro recolor)",
        "colorquest-16",
        "Combi 16",
        "Commodore 64",
        "Commodore VIC-20",
        "Cookiebox-16",
        "Copper Tech",
        "Corruption-16",
        "Crayon16",
        "Cretaceous-16",
        "Crimso 11",
        "Cthulhu 16",
        "Damage Dice 10 & 6",
        "Darkseed 16",
        "DawnBringer 16",
        "Deep 16",
        "Deep Forest 16",
        "DinoKnight 16",
        "Doodle 16",
        "Doomed",
        "DOS's Gloomy Gloss",
        "Drazile 16",
        "drowsy 16",
        "Easter Island",
        "Endesga 16",
        "Endesga Soft 16",
        "ENOS16",
        "Eroge Copper",
        "eteRN16",
        "Europa 16",
        "Explorers16",
        "Fading 16",
        "Fantasy 16",
        "Flowers",
        "FlyGuy 16",
        "Forest-16",
        "fourbit",
        "Fun16",
        "FZT Ethereal 16",
        "Galaxy Flame",
        "Go-line",
        "GRAYSCALE 16",
        "Griefwards and through",
        "Grunge Shift",
        "Harpy 16",
        "Hasty Rainbow 4bit",
        "Huc 16",
        "Huemeister",
        "HWAYS-16",
        "Ice Cream 16",
        "Intellivision",
        "Island Joy 16",
        "Isolated16",
        "JMP (Japanese Machine Palette)",
        "JONK 16",
        "Jr-16",
        "Jr-Comp",
        "Just add water",
        "JW-64",
        "king-16",
        "Krzywinski Colorblind 16",
        "Ladder 5",
        "Lemon 16",
        "Light Fantasy Game",
        "Limted-16",
        "link awakening : links colour",
        "Loop Hero",
        "Lost Century",
        "LovePal 16",
        "Lovey-Dovey 16",
        "LucasArts Atari ST",
        "Lump 16",
        "Macintosh II",
        "Magik16",
        "Mappletosh 16",
        "Master-16",
        "Melody 16",
        "MG16",
        "MICROSOFT VGA",
        "Microsoft Windows",
        "Minecraft Concrete",
        "Minecraft Dyes",
        "Minecraft Wool",
        "mystic-16",
        "NA16",
        "Naji 16",
        "Nanner 16",
        "Nanner Jam",
        "NanoC-16",
        "Natural Colour System 16",
        "Newer Graphics Adapter",
        "Night 16",
        "Nord theme",
        "NYANKOS16",
        "Old Christmas",
        "Optimum",
        "Oxygen 16",
        "PAC-16",
        "Pastari16",
        "Pastel Love",
        "Pastry Shop",
        "pavanz 16",
        "Peachy Pop 16",
        "PICO-8",
        "PICO-DB",
        "PP-16",
        "prospec_cal",
        "Proto 64",
        "psyche16",
        "Psygnosia",
        "Punolite",
        "PYXEL",
        "QAOS Minimalist 16",
        "Rabbit Jump",
        "Race You Home!",
        "Random16",
        "Rayleigh",
        "retro_cal",
        "retrobubble.",
        "RGGB 4-bit color palette",
        "RISC OS",
        "SHIDO CYBERNEON",
        "Shifty16",
        "Shine 16",
        "Sierra Adventures Atari ST",
        "SimpleJPC-16",
        "Sk 16",
        "Skedd16",
        "Smooth 16",
        "Softboy 16",
        "Soldier 16",
        "Spiral 16",
        "Steam Lords",
        "Summers Past-16",
        "Supaplex",
        "Super Breakout ST",
        "Super Cassette Vision",
        "super pocket boy",
        "Super17 16",
        "Sweetie 16",
        "Sweets-16",
        "System Mini 16",
        "Taffy 16",
        "Tauriel-16",
        "Thanksmas 16",
        "The Amazing Spider-Man",
        "The Perfect Palette pocket",
        "the16wonder",
        "Thomson M05",
        "Transit",
        "Triton 16",
        "trk-losat-16",
        "Tropical Chancer",
        "Ultima VI Atari ST",
        "Ultima VI Sharp X68000 ",
        "URBEX 16",
        "V.O.S.P ",
        "vampire-16",
        "vanilla milkshake",
        "Versitle 16",
        "Vibrant ramps",
        "VNES-16 PALETTE",
        "Washed-Over 16",
        "WILSON16",
        "WinterFes 16",
        "Ye Olde Pirate Modde",
        "Zeitgeist16",
        "ZXArne 5.2",
        "/r/Place",
        "16 Bital",
        "16Dan",
        "4-Bit RGB",
        "[thUg] 16",
    ];
    
    // Filter to only include palettes that actually exist
    return testNames.filter(name => {
        try {
            const palette = lospec_palette(name);
            return palette && Array.isArray(palette) && palette.length > 0;
        } catch (e) {
            return false;
        }
    });
}

function populatePaletteList() {
    const paletteListElement = document.getElementById('paletteList');
    paletteListElement.innerHTML = '';
    
    // Add favorites section first if we have any
    if (favorites.size > 0) {
        const favoritePalettes = paletteNames.filter(name => favorites.has(name));
        if (favoritePalettes.length > 0) {
            // Add favorites header
            const favoritesHeader = document.createElement('div');
            favoritesHeader.className = 'favorites-header';
            favoritesHeader.textContent = '★ Favorites';
            paletteListElement.appendChild(favoritesHeader);
            
            // Add favorite palettes
            favoritePalettes.forEach(paletteName => {
                const paletteItem = createPaletteItem(paletteName, true);
                paletteListElement.appendChild(paletteItem);
            });
            
            // Add separator
            const separator = document.createElement('div');
            separator.className = 'favorites-separator';
            paletteListElement.appendChild(separator);
        }
    }
    
    // Add all palettes
    paletteNames.forEach(paletteName => {
        const paletteItem = createPaletteItem(paletteName, false);
        paletteListElement.appendChild(paletteItem);
    });
}

function createPaletteItem(paletteName, isFavorite = false) {
    const paletteItem = document.createElement('div');
    paletteItem.className = 'palette-item';
    paletteItem.dataset.paletteName = paletteName;
    paletteItem.tabIndex = 0; // Make focusable
    
    // Create palette name span
    const paletteNameSpan = document.createElement('span');
    paletteNameSpan.className = 'palette-name';
    paletteNameSpan.textContent = paletteName;
    
    // Create star button
    const starButton = document.createElement('button');
    starButton.className = favorites.has(paletteName) ? 'star-button favorited' : 'star-button';
    starButton.innerHTML = favorites.has(paletteName) ? '★' : '☆';
    starButton.title = favorites.has(paletteName) ? 'Remove from favorites' : 'Add to favorites';
    starButton.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(paletteName);
    };
    
    paletteItem.appendChild(paletteNameSpan);
    paletteItem.appendChild(starButton);
    
    paletteItem.onclick = () => selectPalette(paletteName, paletteItem);
    paletteItem.onkeydown = (e) => handlePaletteItemKeydown(e, paletteName, paletteItem);
    
    return paletteItem;
}

async function selectPalette(paletteName, paletteElement) {
    // Update UI selection
    document.querySelectorAll('.palette-item').forEach(item => {
        item.classList.remove('selected');
    });
    paletteElement.classList.add('selected');
    
    selectedPalette = paletteName;
    document.getElementById('loadPaletteBtn').disabled = false;
    
    // Update preview header
    document.getElementById('previewTitle').textContent = paletteName;
    document.getElementById('previewInfo').textContent = 'Loading preview...';
    
    // Load and display palette preview
    await loadPalettePreview(paletteName);
    
    // If live preview is enabled, apply palette to main canvas
    if (livePreviewEnabled) {
        ipcRenderer.send('palette-browser-live-preview', paletteName);
    }
}

async function loadPalettePreview(paletteName) {
    try {
        // Check if preview is already cached
        if (loadedPreviews.has(paletteName)) {
            displayPalettePreview(paletteName, loadedPreviews.get(paletteName));
            return;
        }
        
        // Load palette
        const colors = lospec_palette(paletteName);
        
        // Generate preview data
        const previewData = generatePalettePreview(colors, paletteName);
        loadedPreviews.set(paletteName, previewData);
        
        displayPalettePreview(paletteName, previewData);
        
    } catch (error) {
        console.error('Error loading palette preview for', paletteName, ':', error);
        console.error('Error stack:', error.stack);
        document.getElementById('previewInfo').textContent = `Error: ${error.message}`;
        document.getElementById('previewContent').innerHTML = `Failed to load palette preview: ${error.message}`;
    }
}

function generatePalettePreview(colors, paletteName) {
    try {        
        // Create canvas for color swatches
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size: 2 colors wide × 8 colors tall (16 colors total)
        const swatchSize = 48;
        const cols = 2;
        const rows = 8;
        canvas.width = swatchSize * cols;
        canvas.height = swatchSize * rows;
                
        // Draw all 16 colors in a 2x8 grid (fill columns first)
        for (let i = 0; i < 16 && i < colors.length; i++) {
            const x = Math.floor(i / rows) * swatchSize;
            const y = (i % rows) * swatchSize;
            
            // Convert hex to proper format if needed
            let color = colors[i];
            if (!color.startsWith('#')) {
                color = '#' + color;
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, swatchSize, swatchSize);            
        }
        
        const dataUrl = canvas.toDataURL();
        
        return {
            canvas: canvas,
            colors: colors,
            dataUrl: dataUrl
        };
    } catch (error) {
        console.error('Error in generatePalettePreview:', error);
        throw error;
    }
}

function paletteNameToUrl(paletteName) {
    // Convert palette name to URL-safe format for Lospec using standard approach
    return paletteName
        .toLowerCase()
        .normalize('NFD')             // Normalize unicode characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/['.]/g, '')         // Remove apostrophes and periods
        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}

function displayPalettePreview(paletteName, previewData) {
    const previewContent = document.getElementById('previewContent');
    const previewInfo = document.getElementById('previewInfo');
    
    // Update info with Lospec URL
    const urlSafeName = paletteNameToUrl(paletteName);
    const lospecUrl = `https://lospec.com/palette-list/${urlSafeName}`;
    previewInfo.innerHTML = `<a href="#" onclick="openExternalUrl('${lospecUrl}')" style="color: #7ec4c1; text-decoration: none; cursor: pointer;">${lospecUrl}</a>`;
    
    // Display preview
    previewContent.innerHTML = '';
    
    // Add the color grid
    const img = document.createElement('img');
    img.src = previewData.dataUrl;
    previewContent.appendChild(img);
    
    // Add color list with hex values
    const colorList = document.createElement('div');
    colorList.className = 'color-list';
    previewData.colors.forEach((color, index) => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item';
        
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'color-swatch';
        colorSwatch.style.backgroundColor = color.startsWith('#') ? color : '#' + color;
        
        const colorHex = document.createElement('span');
        colorHex.className = 'color-hex';
        colorHex.textContent = color.startsWith('#') ? color : '#' + color;
        
        colorItem.appendChild(colorSwatch);
        colorItem.appendChild(colorHex);
        colorList.appendChild(colorItem);
    });
    
    previewContent.appendChild(colorList);
}

function openExternalUrl(url) {
    shell.openExternal(url);
}

function send(channel, opts) {
    ipcRenderer.send(channel, {id: require('electron').remote.getCurrentWindow().getParentWindow().id, ...opts});
}

function loadSelectedPalette() {
    if (selectedPalette) {
        // Send palette selection back to main window
        ipcRenderer.send('palette-browser-selection', selectedPalette);
        closeModal();
    }
}

function closeModal() {
    send('close_modal');
}

function handlePaletteItemKeydown(e, paletteName, paletteElement) {
    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            navigateUp(paletteElement);
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateDown(paletteElement);
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            selectPalette(paletteName, paletteElement);
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFavorite(paletteName);
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

function getAllNavigableItems() {
    return Array.from(document.querySelectorAll('.palette-item'));
}

function focusElement(element) {
    element.focus();
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
    
    // If it's a palette item, trigger selection
    if (element.classList.contains('palette-item')) {
        const paletteName = element.dataset.paletteName;
        if (paletteName) {
            selectPalette(paletteName, element);
        }
    }
}

function selectFirstPalette() {
    const allPaletteItems = document.querySelectorAll('.palette-item');
    if (allPaletteItems.length > 0) {
        const firstPalette = allPaletteItems[0];
        focusElement(firstPalette);
    }
}

// Add global keyboard handler
function setupKeyboardNavigation() {
    // Add global escape key handler
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'Escape':
                e.preventDefault();
                closeModal();
                break;
            case 'Enter':
                // Handle Enter globally - load selected palette if we have one
                if (selectedPalette && !e.target.closest('.buttons')) {
                    e.preventDefault();
                    loadSelectedPalette();
                }
                break;
        }
    });
}

// Live preview functionality
function setupLivePreview() {
    const checkbox = document.getElementById('livePreviewCheckbox');
    if (checkbox) {
        // Load saved preference
        const saved = localStorage.getItem('paletteBrowserLivePreview');
        livePreviewEnabled = saved === 'true';
        checkbox.checked = livePreviewEnabled;
        
        checkbox.addEventListener('change', (e) => {
            livePreviewEnabled = e.target.checked;
            localStorage.setItem('paletteBrowserLivePreview', livePreviewEnabled.toString());
            
            // If enabled and we have a selected palette, apply it immediately
            if (livePreviewEnabled && selectedPalette) {
                ipcRenderer.send('palette-browser-live-preview', selectedPalette);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePaletteBrowser();
    setupKeyboardNavigation();
    setupLivePreview();
    // Uncomment to enable debug menu
    // require('electron').remote.getCurrentWindow().webContents.openDevTools();
});

// Favorites management functions
function loadFavorites() {
    try {
        const savedFavorites = localStorage.getItem('paletteBrowserFavorites');
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
        localStorage.setItem('paletteBrowserFavorites', JSON.stringify([...favorites]));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

function toggleFavorite(paletteName) {
    console.log('Toggling favorite for:', paletteName);
    if (favorites.has(paletteName)) {
        favorites.delete(paletteName);
    } else {
        favorites.add(paletteName);
    }
    
    saveFavorites();
    
    // Store the current focus/selection state
    const currentlyFocusedElement = document.activeElement;
    const currentlySelectedPalette = selectedPalette;
    
    // Update all star buttons for this palette
    document.querySelectorAll(`[data-palette-name="${CSS.escape(paletteName)}"] .star-button`).forEach(button => {
        button.innerHTML = favorites.has(paletteName) ? '★' : '☆';
        button.title = favorites.has(paletteName) ? 'Remove from favorites' : 'Add to favorites';
        button.className = favorites.has(paletteName) ? 'star-button favorited' : 'star-button';
    });
    
    // Refresh the palette list to show/hide favorites section
    populatePaletteList();
    
    // Restore selection to the same palette in the same context (not jumping to favorites)
    if (currentlySelectedPalette) {
        // Try to find the palette element that was originally focused
        let targetElement = null;
        
        // If we were focused on a palette in the favorites section and it's still favorited,
        // or if we were in the regular list, prefer the regular list version
        const allMatching = document.querySelectorAll(`[data-palette-name="${CSS.escape(currentlySelectedPalette)}"]`);
        
        if (allMatching.length > 0) {
            // If there are multiple instances (favorites + original), prefer non-favorites unless
            // the user was specifically in the favorites section
            if (allMatching.length > 1 && (!currentlyFocusedElement || 
                !currentlyFocusedElement.closest('.palette-item')?.previousElementSibling?.classList?.contains('favorites-header'))) {
                // Find the non-favorites version (usually the last one)
                targetElement = allMatching[allMatching.length - 1];
            } else {
                // Use the first available instance
                targetElement = allMatching[0];
            }
        }
        
        if (targetElement) {
            selectPalette(currentlySelectedPalette, targetElement);
            targetElement.focus();
        }
    }
}

// Handle window close
window.addEventListener('beforeunload', () => {
    // Clean up any resources if needed
    loadedPreviews.clear();
});