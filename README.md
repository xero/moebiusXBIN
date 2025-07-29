
# Moebius XBIN 
MoebiusXBIN is an ASCII / text-mode graphics editor for MacOS, Linux and Windows, with support for custom fonts and colors. 

![Screenshot of MoebiusXBIN UI][https://raw.githubusercontent.com/hlotvonen/moebius/refs/heads/master/moebiusXBIN_screenshot.png]

This is a *forked version* of [Moebius](https://github.com/blocktronics/moebius), a classic ASCII and ANSI art editor. MoebiusXBIN extends it by supporting custom colors and fonts with the XBIN format.

## Download packages
- Moebius XBIN: https://github.com/hlotvonen/moebius/releases

## How to use MoebiusXBIN?
- You can click to open the tutorial for MoebiusXBIN when you open the app, either by clicking the Tutorial button in the splash screen, or from the Help menu.
- You can view all the (updated) keyboard shortcuts from the Help menu, and selecting "Keyboard shortcut cheatsheet"

## New features
### Custom fonts
- Custom font support (load & save)
- Thousands of new fonts:
    - Added VileR's [VGA text-mode fonts](https://github.com/viler-int10h/vga-text-mode-fonts/tree/master)
    - :new: Added 661 new fonts sourced from various Amiga discs
    - :new: Font browser with filtering, live preview, and favorites
- :new: Import and export fonts as PNG
- 9px font as preference option
- Font character set displayed in the sidebar 
- Character code display in status bar

### Multilingual support
- :new: Added writing directions: right-to-left, top-to-bottom, bottom-to-top
- :new: Added non-CP437 encodings support with iconv-lite
- :new: Cardinal newline directions with position tracking
- :new: Arabic text support with shaping and ligatures

### Text input upgrades 
- :new: Q key inserts selected character feature
- :new: Use number keys as function keys preference
- :new: Use Alt keycodes to insert characters
- :new: Load/save character sets as ANS files
- :new: Optional character set remapping on click toggle
- :new: Added hotkey to SHIFT+ALT+Left Click to pick character from the canvas

### New tutorial
- :new: Splash screen now has a tutorial button

### Custom colors 
- 24-bit color support (thanks to jejacks0n!)
- Added hundreds of 16 color palettes sourced from Lospec.com
- :new: Palette browser with live preview and favorites
- :new: Load/save palettes as hex files

### UI and reference images
- :new: Drawing grid feature with 1x1 grid option (thanks to [grymmjack](https://github.com/grymmjack/moebius/commits?author=grymmjack!)
- :new: Middle line guide
- :new: 50% zoom support
- PETSCII support and guide
- Reference image tool with drag, opacity, width/angle controls (thanks to [michael-lazar](https://github.com/grymmjack/moebius/commits?author=michael-lazar!)
- Reference images in separate windows

### Canvas resizing
- :new: Alt+arrows for Insert/delete row/column with canvas resizing similar to Pablodraw

### Some bugfixes
- Fixed XBIN encoding not saving font data (82ac695, 114889d)
- Fix saving odd-column xbins and fix double-appending SAUCE records to xbin files (ce08e0f)
- Fix the "Save Without Sauce Info" menu operation (a887f54)
- Fixed charlist size when hidden and reshown (6caff43)
- Fixes scroll behavior for 200% zoom (104165a, 4703f7e)
- Fixes mouse move events from not triggering on the cell that was most recently clicked (c8f97b9)
- Fixing mouse coords when 9px font (479cceb)
- Fixed custom font loading and improved error messaging (62c7e47)
- Fixed bug where ctrl+x would cut even with no selection (afa4040)
- Alt+arrows would scroll the view also, preventing the insert/delete row from happening (eacb7c1)
- When canvas is resized, drawing guides dont disappear anymore (466452c)
- Bugfix: remove ice colors as new document works now (3f04b6e)
- bugfix: https://github.com/grymmjack/moebius/issues/30 Right justifying a line no longer resets bg color to 0 (91e4aaa)
- Moved canvas to middle if zoomed 200% (795564b)
- switched some layouts from using floats to css grid
- fixed bug where ctrl+x would cut even with no selection.

## Acknowledgements
* All credits go to Andy Herbert who made the original Moebius.
* This fork is maintained by me, hlotvonen
* Huge thanks for major contributions to grymmjack, jejacks0n, michael-lazar and bart-d, among others.
* Grymmjack maintains [his own fork](https://github.com/grymmjack/moebius) of my fork, but I have now merged it.
* Uses modified Google's Material Icons. https://material.io/icons/
* Included fonts:
  * GJSCI-3, GJSCI-4 and GJSCI-X appears courtesy of [GrymmJack](https://www.youtube.com/channel/UCrp_r9aomBi4mryxSxLq24Q)
  * [FROGBLOCK](https://polyducks.itch.io/frogblock) appears courtesy of [PolyDucks](http://polyducks.co.uk/)
  * Newschool fonts collected and modified from the [NewSchool pack](https://16colo.rs/pack/newschool-01), courtesy of XBIN workshop participants at the Estonian Academy of Arts in 2021.
  * structures font by [Gladys Camilo](https://gladyscamilo.com/)
  * TES-* fonts by me.
  * Topaz originally appeared in Amiga Workbench, courtesy of Commodore Int.
  * Topaz Kickstart versions uncovered by [heckmeck](https://heckmeck.de/blog/amiga-topaz-1.4/), courtesy of Commodore Int.
  * P0t-NOoDLE appears courtesy of Leo 'Nudel' Davidson
  * mO'sOul appears courtesy of Desoto/Mo'Soul
  * [Viler's VGA font collection](https://github.com/viler-int10h/vga-text-mode-fonts), with additional info on sources in the [FONTS.TXT](https://github.com/viler-int10h/vga-text-mode-fonts/blob/master/FONTS.TXT)
  * Discmaster fonts collected from [discmaster.textfiles.com](https://discmaster.textfiles.com/search?family=font&format=amigaBitmapFont&widthMin=312&heightMin=76&widthMax=312&heightMax=85&limit=500&showItemName=showItemName)

## License
Copyright 2021 Andy Herbert

Licensed under the [Apache License, version 2.0](https://github.com/blocktronics/moebius/blob/master/LICENSE.txt)
