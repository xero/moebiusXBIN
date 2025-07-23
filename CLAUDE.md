# Composition Mode Implementation Guide

## Overview

This document provides a step-by-step implementation guide for adding Composition Mode to the Moebius textmode art editor. The feature allows users to arrange multiple textmode files into larger compositions with layers, positioning, and various operations.

## Architecture Context

Based on the existing codebase analysis, the implementation follows these key patterns:
- Document windows managed by moebius.js with unique IDs
- Modal system for specialized interfaces 
- Tool integration through the existing tools system
- Block operations with transparent/over/under modes
- Event-driven architecture with IPC communication
- CSS Grid layout with custom properties
- Independent undo/redo system per document

## Implementation Phases

### Phase 1: Core Canvas & Layer Management
- Basic composition window with canvas and layer sidebar
- Add/remove layers, save/load JSON compositions
- Grid display and basic positioning

### Phase 2: Layer Operations  
- Block operations (move, copy, stamp, flip, transparent, z-order)
- Layer manipulation with keyboard shortcuts and UI buttons
- Independent undo/redo system

### Phase 3: Export & Polish
- PNG export functionality
- Visual feedback and polish
- Error handling and validation

## Implementation Steps

The following steps are designed to be implemented sequentially, with each step building upon the previous ones. Each step should be fully tested before proceeding to the next.

---

## Step 1: Create Folder Structure and Base Files

**Objective**: Set up the isolated folder structure for composition mode with minimal integration points.

**Context**: All composition-related code must be isolated in `/composition/` folder to avoid affecting existing editor functionality. This follows the codebase convention of modular organization.

**Implementation Requirements**:
1. Create `/composition/` folder structure
2. Add basic HTML template following existing modal patterns
3. Create CSS file following existing naming conventions
4. Add minimal menu integration points

```
Create the folder structure for composition mode following the existing codebase patterns:

1. Create `/composition/` folder in the project root
2. Inside `/composition/`, create these subfolders and files:
   - `html/composition.html` - Main composition window HTML
   - `css/composition.css` - Composition-specific styles  
   - `js/composition.js` - Main composition logic
   - `js/composition-canvas.js` - Canvas rendering logic
   - `js/composition-layers.js` - Layer management logic

3. Set up basic HTML template in `composition/html/composition.html`:
   - Follow the structure of `app/html/document.html`
   - Include a main canvas area and sidebar for layers
   - Use CSS Grid layout similar to existing patterns
   - Add basic menu bar structure
   - Include necessary script imports

4. Create basic CSS in `composition/css/composition.css`:
   - Follow existing CSS conventions and naming patterns
   - Use CSS custom properties for dimensions like existing files
   - Set up grid layout for canvas and sidebar
   - Include basic styling for layer list items

5. Add minimal menu integration in `app/menu.js`:
   - Add "New Composition" menu item under File menu
   - Add "Open Composition" menu item under File menu
   - Follow existing menu creation patterns
   - Create event handlers that will open composition windows

6. Create basic composition window management in `app/moebius.js`:
   - Add composition window creation function
   - Follow existing document window patterns
   - Set up IPC communication structure
   - Add composition to active windows tracking

Test that the basic folder structure is created and menu items appear without breaking existing functionality.
```

---

## Step 2: Basic Composition Window Infrastructure

**Objective**: Implement the basic composition window that can open and display a canvas with configurable dimensions.

**Context**: This step creates the foundation window management following the existing modal and document window patterns from the codebase.

```
Implement the basic composition window infrastructure:

1. In `composition/js/composition.js`, create the main CompositionWindow class:
   - Follow the pattern of existing modal/window classes
   - Initialize with canvas dimensions, background color, grid size
   - Set up event listeners for window events
   - Create IPC communication with main process

2. Implement basic canvas setup in `composition/js/composition-canvas.js`:
   - Create canvas element with configurable dimensions
   - Implement basic rendering loop
   - Add background color rendering
   - Create grid overlay system following existing guide patterns from the main editor

3. Set up window lifecycle management:
   - Window creation and initialization
   - Window close handling with unsaved changes prompt
   - Memory cleanup on window close
   - Integration with existing window management system

4. Add basic composition data structure:
   - JSON structure for storing composition metadata
   - Canvas configuration (width, height, backgroundColor, gridSize)
   - Empty layers array for future use
   - Basic validation for composition data

5. Implement window menu bar:
   - File menu with New, Open, Save, Export (PNG) items
   - View menu with Toggle Grid item
   - Follow existing menu patterns from document windows
   - Set up IPC handlers for menu actions

6. Add basic file operations:
   - Save composition as JSON file
   - Load composition from JSON file
   - File dialogs using existing patterns from main editor
   - Error handling for file operations

Test that composition windows can be created, display a canvas with grid, and basic file operations work.
```

---

## Step 3: Layer Management System

**Objective**: Implement the core layer management system with sidebar UI for adding, removing, and listing layers.

**Context**: This builds the layer system that will hold references to textmode files, following the existing document management patterns.

```
Implement the layer management system:

1. In `composition/js/composition-layers.js`, create the LayerManager class:
   - Array-based layer storage with unique IDs
   - Layer data structure: { id, filePath, fileName, position: {x, y}, transparent: false, zIndex }
   - Methods for add, remove, move, reorder layers
   - Event system for layer changes

2. Implement layer sidebar UI:
   - Layer list display in sidebar following existing UI patterns
   - Layer item templates with filename display
   - Selection highlighting for active layer
   - Drag and drop reordering (basic mouse events)

3. Add layer file operations:
   - "Add Layer" functionality with file browser dialog
   - Support for .ans, .xb, .txt, and other textmode file formats
   - File path validation and error handling
   - Layer filename extraction and display

4. Implement layer removal:
   - Remove layer button/functionality
   - Confirmation dialog for layer removal
   - Cleanup of layer references and UI updates

5. Add layer selection system:
   - Click to select layer in sidebar
   - Visual highlighting of selected layer
   - Keyboard navigation (up/down arrows)
   - Selected layer state management

6. Integrate with composition data:
   - Save/load layer configuration in JSON
   - Layer data persistence across sessions
   - Validation of layer file paths on load

7. Add basic layer rendering preparation:
   - Load textmode file content for each layer
   - Basic error handling for missing files
   - Preparation for canvas rendering (next step)

Test that layers can be added, removed, selected, and reordered. Verify composition save/load includes layer data.
```

---

## Step 4: Layer Rendering and Positioning

**Objective**: Implement rendering of textmode files as layers on the composition canvas with basic positioning.

**Context**: This step integrates with the existing libtextmode rendering system to display textmode art files as layers on the composition canvas.

```
Implement layer rendering and positioning:

1. Extend `composition/js/composition-canvas.js` with layer rendering:
   - Integration with existing libtextmode.js for textmode file parsing
   - Layer rendering pipeline: parse file -> render to temporary canvas -> composite to main canvas
   - Support for different textmode formats (.ans, .xb, etc.)
   - Layer clipping at canvas boundaries

2. Implement layer positioning system:
   - Grid-based positioning (default 8x16 pixel grid)
   - Layer position storage and management
   - Position validation and boundary checking
   - Visual positioning feedback

3. Add file loading and parsing:
   - Load textmode files referenced by layers
   - Use existing libtextmode parsing functions
   - Error handling for corrupted or missing files
   - File change detection and auto-reload

4. Implement layer rendering order:
   - Z-index based rendering (bottom to top)
   - Layer visibility management
   - Rendering optimization for large numbers of layers

5. Add layer canvas operations:
   - Individual layer canvas creation
   - Layer canvas caching for performance
   - Canvas cleanup and memory management
   - Support for different font sizes and types

6. Implement basic layer interaction:
   - Click to select layer on canvas
   - Visual selection indicators
   - Hover effects for layer identification
   - Layer bounds detection for mouse interaction

7. Add canvas refresh and update system:
   - Automatic refresh when layer files change
   - Manual refresh functionality
   - Efficient partial updates when possible
   - Progress indicators for large layer operations

Test that textmode files render correctly as layers, can be positioned on the canvas, and selection works both in sidebar and on canvas.
```

---

## Step 5: Layer Selection and Basic Operations

**Objective**: Implement layer selection system and basic operations (Edit, Remove) following existing editor patterns.

**Context**: This step creates the foundation for layer manipulation by implementing selection and basic operations, following the cursor and tool patterns from the main editor.

```
Implement layer selection and basic operations:

1. Extend layer selection system in `composition/js/composition-layers.js`:
   - Layer selection state management
   - Visual selection indicators on both canvas and sidebar
   - Keyboard shortcuts for layer navigation (up/down arrows)
   - Mouse click selection on canvas and sidebar

2. Add Edit layer functionality:
   - Double-click to edit layer (opens file in new editor window)
   - Integration with existing document opening system
   - Focus management between composition and editor windows
   - Auto-refresh composition when editor saves file

3. Implement Remove layer operation:
   - Remove button in layer sidebar
   - Keyboard shortcut (R key) when layer selected
   - Confirmation dialog for remove operation
   - Proper cleanup of layer data and canvas

4. Add layer operation buttons to sidebar:
   - Edit button (launches editor for selected layer)
   - Remove button (removes selected layer)
   - Button enable/disable based on selection state
   - Tooltip information for buttons

5. Implement layer visual feedback:
   - Selected layer highlighting on canvas
   - Selected layer highlighting in sidebar
   - Layer hover effects
   - Visual indicators for layer state (selected, transparent, etc.)

6. Add keyboard shortcut system:
   - E key for Edit selected layer
   - R key for Remove selected layer
   - Arrow keys for layer selection navigation
   - Integration with existing keyboard handling patterns

7. Implement layer context menu:
   - Right-click context menu for layers
   - Context menu items: Edit, Remove, Move Up, Move Down
   - Context menu positioning and styling
   - Integration with existing context menu patterns

Test that layers can be selected via mouse and keyboard, Edit opens files in editor windows, Remove works with confirmation, and visual feedback is clear.
```

---

## Step 6: Grid Snapping and Movement System

**Objective**: Implement the grid-based positioning system with snapping, following the existing guide and grid patterns from the main editor.

**Context**: This step adds the foundation for layer positioning that will be used by the move operations in later steps.

```
Implement grid snapping and movement system:

1. Extend `composition/js/composition-canvas.js` with grid system:
   - Grid configuration (default 8x16 pixels)
   - Grid line rendering following existing guide patterns
   - Toggle grid visibility (View menu item)
   - Grid snap calculation functions

2. Implement grid snapping logic:
   - Snap coordinates to grid boundaries
   - Grid snap tolerance settings
   - Visual snap feedback during operations
   - Grid alignment validation

3. Add position management system:
   - Layer position storage and retrieval
   - Position change validation
   - Position bounds checking (can extend beyond canvas)
   - Position change history for undo/redo

4. Implement basic layer dragging preparation:
   - Mouse down/move/up event handling on canvas
   - Layer hit testing (determining which layer is clicked)
   - Drag state management
   - Visual feedback preparation for drag operations

5. Add position display and editing:
   - Position information display in layer sidebar
   - Numeric position editing capability
   - Position input validation
   - Automatic grid snapping for manual position input

6. Implement grid configuration:
   - Grid size customization (default 8x16)
   - Grid color and style options
   - Grid visibility persistence in composition files
   - Grid settings UI in composition preferences

7. Add coordinate system utilities:
   - Canvas coordinates to grid coordinates conversion
   - Grid coordinates to canvas coordinates conversion
   - Relative positioning calculations
   - Boundary and overlap detection functions

Test that grid displays correctly, can be toggled on/off, positions snap to grid, and layer positions can be viewed and manually edited.
```

---

## Step 7: Move Operation Implementation

**Objective**: Implement the Move (M key) operation for layers, following the existing MOVE_BLOCK patterns from the main editor.

**Context**: This step implements the first of the block operations, following the established patterns from the main editor's block operations system.

```
Implement the Move operation for layers:

1. Create move operation state management in `composition/js/composition-layers.js`:
   - Move mode activation/deactivation
   - Move operation state tracking
   - Visual feedback state management
   - Operation cancellation handling

2. Implement move operation following MOVE_BLOCK patterns:
   - M key to activate move mode on selected layer
   - Layer follows mouse cursor during move
   - Grid snapping during move operation
   - ESC key to cancel move operation
   - ENTER key to confirm move placement

3. Add visual feedback during move:
   - Semi-transparent layer rendering during move
   - Grid snap preview
   - Move operation cursor changes
   - Visual indication of move mode active

4. Implement mouse interaction for move:
   - Mouse move updates layer position preview
   - Grid snapping on mouse movement
   - Click to place layer at new position
   - Mouse boundary handling (can move beyond canvas)

5. Add keyboard movement controls:
   - Arrow keys move layer one grid cell at a time
   - Shift+arrows for larger movements
   - Numeric keypad support for diagonal movement
   - Keyboard movement with grid snapping

6. Integrate with undo/redo system:
   - Move operation as undoable action
   - Position change recording
   - Undo/redo stack management
   - Operation grouping for efficient undo

7. Add move operation validation:
   - Collision detection (if needed)
   - Boundary validation
   - Move operation constraints
   - Error handling for invalid moves

Test that M key activates move mode, layer follows mouse with grid snapping, arrow keys work for precise movement, and ENTER/ESC properly confirm/cancel the operation.
```

---

## Step 8: Copy and Stamp Operations

**Objective**: Implement Copy (C key) and Stamp (S key) operations, following the existing block operation patterns.

**Context**: These operations extend the layer manipulation system with duplication capabilities, following the established block operation patterns from the main editor.

```
Implement Copy and Stamp operations:

1. Extend operation state management for copy/stamp:
   - Copy mode activation with C key
   - Stamp mode activation with S key
   - Operation state tracking and visual feedback
   - Mode switching and cancellation handling

2. Implement Copy operation:
   - C key creates copy of selected layer
   - Copy follows mouse for positioning like move operation
   - Grid snapping for copy placement
   - ENTER to place copy, ESC to cancel
   - Original layer remains in place

3. Implement Stamp operation:
   - S key creates copy and immediately places at current position
   - No mouse following - instant duplication
   - Automatic grid snapping for stamp placement
   - Multiple stamps by repeated S key presses
   - Stamp positioning logic (offset from original)

4. Add copy operation visual feedback:
   - Preview of copied layer during placement
   - Different visual style from move operation
   - Grid snap indicators during copy placement
   - Original layer remains visible during copy

5. Implement layer duplication logic:
   - Deep copy of layer data structure
   - Unique ID generation for copied layers
   - Layer naming convention for copies (e.g., "filename_copy")
   - Z-index management for new layers

6. Add copy/stamp to undo/redo system:
   - Copy creation as undoable action
   - Stamp operation undo/redo support
   - Layer creation/deletion history
   - Efficient undo for multiple stamps

7. Integrate copy/stamp with layer management:
   - Add copied layers to layer list
   - Layer selection after copy/stamp operations
   - Layer sidebar updates for new layers
   - File reference handling for copied layers

Test that C key creates moveable copy, S key creates instant stamp, both operations integrate with undo/redo, and layer management handles the new layers correctly.
```

---

## Step 9: Layer Transformation Operations (Flip X, Flip Y)

**Objective**: Implement Flip X (X key) and Flip Y (Y key) operations for layers, following the existing transformation patterns.

**Context**: These operations add transformation capabilities to layers, requiring integration with the textmode rendering system to modify the layer content.

```
Implement layer transformation operations:

1. Add transformation state to layer data structure:
   - Add flipX and flipY boolean properties to layer objects
   - Transformation state persistence in JSON composition files
   - Transformation state display in layer sidebar
   - Transformation state management and validation

2. Implement Flip X operation:
   - X key toggles horizontal flip of selected layer
   - Immediate visual feedback on canvas
   - Integration with existing textmode rendering pipeline
   - Preservation of layer position during flip

3. Implement Flip Y operation:
   - Y key toggles vertical flip of selected layer
   - Immediate visual feedback on canvas
   - Integration with textmode rendering system
   - Position and alignment handling during flip

4. Add transformation to rendering pipeline:
   - Modify layer rendering to apply transformations
   - Canvas transformation matrix usage
   - Efficient rendering with transformations
   - Clipping and boundary handling for transformed layers

5. Implement transformation visual indicators:
   - Layer sidebar indicators for flip states
   - Tooltip or status information for transformations
   - Visual distinction for transformed layers
   - Transformation state in layer properties

6. Add transformation buttons to sidebar:
   - Flip X button alongside keyboard shortcut
   - Flip Y button alongside keyboard shortcut
   - Button state reflecting current transformation
   - Button grouping and layout

7. Integrate transformations with undo/redo:
   - Transformation changes as undoable actions
   - Undo/redo for flip operations
   - State restoration for transformation changes
   - Efficient undo stack management

Test that X and Y keys toggle layer flips with immediate visual feedback, transformations persist in saved compositions, and undo/redo works correctly with transformations.
```

---

## Step 10: Transparent Mode Implementation

**Objective**: Implement Transparent mode (T key) for layers, following the existing transparent block operation patterns from the main editor.

**Context**: This operation implements transparency handling similar to the main editor's transparent block operations, where spaces and background-0 blocks are treated as transparent.

```
Implement Transparent mode for layers:

1. Add transparent state to layer data structure:
   - Add 'transparent' boolean property to layer objects
   - Transparent state persistence in JSON compositions
   - Transparent state management and validation
   - Default transparent state configuration

2. Implement Transparent mode toggle:
   - T key toggles transparent state of selected layer
   - Immediate visual feedback when transparency changes
   - Transparent state indication in layer sidebar
   - Status updates when transparency mode changes

3. Add transparency to layer rendering:
   - Modify rendering pipeline to handle transparent layers
   - Skip rendering of spaces and background-0 blocks when transparent
   - Proper alpha channel handling in canvas rendering
   - Layer composition with transparency support

4. Implement transparency visual indicators:
   - Layer sidebar indicator for transparent layers
   - Different visual styling for transparent layers in list
   - Canvas overlay or border indication for transparent layers
   - Transparency state in layer tooltips

5. Add transparency button to layer sidebar:
   - Transparent toggle button alongside T key shortcut
   - Button state reflecting current transparency mode
   - Button styling and visual feedback
   - Button grouping with other layer operation buttons

6. Integrate transparency with layer operations:
   - Transparency state preservation during copy/move operations
   - Transparency handling in layer duplication
   - Transparency state in undo/redo operations
   - Transparency considerations for layer selection

7. Add transparency to rendering optimization:
   - Efficient rendering skipping for transparent areas
   - Layer bounds calculation considering transparency
   - Performance optimization for transparent layers
   - Memory usage optimization for transparency

Test that T key toggles transparency with immediate visual feedback, transparent areas don't render over other layers, transparency state persists in compositions, and sidebar indicators work correctly.
```

---

## Step 11: Z-Order Operations (Over, Under)

**Objective**: Implement Over (O key) and Under (U key) operations for changing layer Z-order, following the existing layer ordering patterns.

**Context**: These operations manage the rendering order of layers, determining which layers appear in front of or behind others.

```
Implement Z-order operations:

1. Extend layer Z-order management:
   - Z-index property management in layer data structure
   - Z-order validation and normalization
   - Z-order persistence in JSON compositions
   - Layer rendering order based on Z-index

2. Implement Over operation:
   - O key moves selected layer up one Z-level
   - Visual feedback showing layer moved forward
   - Z-index increment and layer list reordering
   - Boundary handling (can't go above top layer)

3. Implement Under operation:
   - U key moves selected layer down one Z-level
   - Visual feedback showing layer moved backward
   - Z-index decrement and layer list reordering
   - Boundary handling (can't go below bottom layer)

4. Add Z-order visual management in sidebar:
   - Layer list ordered by Z-index (top to bottom)
   - Up/Down arrow buttons for Z-order changes
   - Visual indicators for layer depth
   - Drag and drop reordering in layer list

5. Implement Z-order in rendering pipeline:
   - Layer rendering order based on Z-index values
   - Efficient Z-order sorting for rendering
   - Layer composition from back to front
   - Z-order optimization for performance

6. Add Z-order to undo/redo system:
   - Z-order changes as undoable actions
   - Layer order restoration in undo operations
   - Efficient undo for Z-order operations
   - Group operations for multiple Z-order changes

7. Integrate Z-order with layer operations:
   - Z-order preservation during other operations
   - Z-order handling in layer copy/duplication
   - Z-order considerations for layer selection
   - Z-order validation and error handling

Test that O and U keys change layer order with immediate visual feedback, layer sidebar reflects Z-order changes, rendering order is correct, and undo/redo works with Z-order operations.
```

---

## Step 12: Undo/Redo System Implementation

**Objective**: Implement a comprehensive undo/redo system for composition operations, following the existing undo patterns from the main editor.

**Context**: This step creates an independent undo/redo system for composition mode, similar to the main editor's undo system but tailored to composition operations.

```
Implement comprehensive undo/redo system:

1. Create undo/redo infrastructure in `composition/js/composition-undo.js`:
   - UndoHistory class following main editor patterns
   - Operation types enum for different undoable actions
   - Undo stack management with size limits
   - Redo stack management and clearing

2. Define undoable operation types:
   - ADD_LAYER, REMOVE_LAYER operations
   - MOVE_LAYER, COPY_LAYER operations
   - TRANSFORM_LAYER (flip operations)
   - TRANSPARENCY_CHANGE operations
   - Z_ORDER_CHANGE operations

3. Implement operation recording system:
   - Automatic operation recording for all layer changes
   - Operation data capture (before/after states)
   - Operation grouping for complex changes
   - Operation validation and error handling

4. Add undo/redo commands:
   - Ctrl+Z (Cmd+Z on Mac) for undo
   - Ctrl+Y or Ctrl+Shift+Z for redo
   - Menu items for undo/redo with operation descriptions
   - Keyboard shortcut integration

5. Implement state restoration:
   - Layer state restoration for undo operations
   - Canvas refresh after undo/redo operations
   - Sidebar update after state changes
   - Selection state restoration

6. Add undo/redo visual feedback:
   - Menu item text showing what will be undone/redone
   - Undo/redo button enable/disable states
   - Status bar information for undo/redo operations
   - Progress indication for complex undo operations

7. Integrate with existing operations:
   - Update all layer operations to record undo information
   - Proper undo stack management during operations
   - Undo grouping for multi-step operations
   - Memory management for undo data

Test that all layer operations can be undone and redone, keyboard shortcuts work correctly, menu items show appropriate descriptions, and complex operations undo properly.
```

---

## Step 13: PNG Export Implementation

**Objective**: Implement PNG export functionality that renders the composition to a PNG file with exact canvas dimensions and proper clipping.

**Context**: This step adds the export capability, rendering all layers to a final PNG file following the exact specifications (exact canvas dimensions with clipping).

```
Implement PNG export functionality:

1. Create export system in `composition/js/composition-export.js`:
   - PNG export function with canvas rendering
   - Export canvas creation at exact composition dimensions
   - Layer rendering pipeline for export
   - File save dialog integration

2. Implement export rendering pipeline:
   - Create temporary canvas at composition size
   - Render background color to export canvas
   - Render each layer in Z-order to export canvas
   - Apply clipping at canvas boundaries during export

3. Add export dialog and options:
   - File save dialog for PNG export
   - Export filename generation (based on composition name)
   - Export progress indication for large compositions
   - Error handling for export failures

4. Implement layer rendering for export:
   - High-quality rendering for export (vs. screen display)
   - Proper transparency handling in export
   - Layer transformation application in export
   - Font rendering optimization for export quality

5. Add export menu integration:
   - Export PNG menu item in File menu
   - Keyboard shortcut for export (Ctrl+E)
   - Export status indication in UI
   - Export completion notification

6. Implement export optimization:
   - Memory management during export process
   - Progress updates for large export operations
   - Efficient rendering pipeline for export
   - Canvas cleanup after export completion

7. Add export validation and error handling:
   - Validation of export parameters
   - Error handling for missing layer files
   - User feedback for export errors
   - Export cancellation support

Test that PNG export creates files with exact canvas dimensions, layers are clipped at boundaries, export quality is high, and error handling works correctly.
```

---

## Step 14: Layer Sidebar Enhancement and Polish

**Objective**: Polish the layer sidebar interface with complete functionality, visual indicators, and user experience improvements.

**Context**: This step completes the layer management interface with all the visual feedback and usability features needed for production use.

```
Enhance and polish the layer sidebar interface:

1. Complete layer sidebar visual design:
   - Professional styling following existing app aesthetics
   - Layer item templates with consistent spacing and typography
   - Icon integration for layer states (transparent, flipped, etc.)
   - Hover effects and interaction feedback

2. Implement comprehensive layer state indicators:
   - Visual icons for transparent state
   - Flip X and Flip Y transformation indicators
   - Z-order position indicators
   - Selected layer highlighting

3. Add layer information display:
   - Layer filename display with truncation for long names
   - Layer position information (X, Y coordinates)
   - Layer file type indication
   - Layer state summary tooltips

4. Implement layer sidebar interactions:
   - Click to select layer
   - Double-click to edit layer file
   - Right-click context menu with all operations
   - Keyboard navigation within sidebar

5. Add layer operation button polish:
   - Button grouping and consistent styling
   - Icon buttons with tooltips
   - Button state management (enabled/disabled)
   - Visual feedback for button actions

6. Implement layer list management:
   - Scroll handling for long layer lists
   - Layer list resizing and overflow handling
   - Layer search/filter capability (if needed)
   - Layer list performance optimization

7. Add accessibility and usability features:
   - Keyboard accessibility for all sidebar functions
   - Screen reader compatibility
   - High contrast mode support
   - Consistent tab order and focus management

Test that layer sidebar is visually polished, all interactions work smoothly, state indicators are clear and accurate, and the interface feels professional and intuitive.
```

---

## Step 15: Menu System Completion and Integration

**Objective**: Complete the composition window menu system with all necessary menu items, keyboard shortcuts, and proper integration with the main application.

**Context**: This step finalizes the menu system to provide full functionality access through standard menu interfaces, following the existing application menu patterns.

```
Complete composition window menu system:

1. Finalize File menu in composition window:
   - New Composition (Ctrl+N)
   - Open Composition (Ctrl+O)
   - Save Composition (Ctrl+S)
   - Save Composition As (Ctrl+Shift+S)
   - Add Layer (Ctrl+L)
   - Export PNG (Ctrl+E)
   - Close Window (Ctrl+W)

2. Complete Edit menu:
   - Undo (Ctrl+Z) with operation description
   - Redo (Ctrl+Y) with operation description
   - Select All Layers (Ctrl+A)
   - Deselect All (Ctrl+D)
   - Delete Selected Layer (Delete key)

3. Implement Layer menu:
   - Move Layer (M)
   - Copy Layer (C)
   - Stamp Layer (S)
   - Flip Horizontal (X)
   - Flip Vertical (Y)
   - Toggle Transparent (T)
   - Move Forward (O)
   - Move Backward (U)
   - Edit Layer (E)

4. Complete View menu:
   - Toggle Grid (Ctrl+G)
   - Zoom In/Out (if implemented)
   - Fit to Window (if implemented)
   - Show/Hide Layer Sidebar

5. Add Help menu:
   - Composition Mode Help
   - Keyboard Shortcuts reference
   - About Composition Mode

6. Implement menu state management:
   - Enable/disable menu items based on context
   - Menu item text updates (showing operation descriptions)
   - Menu state persistence across window focus changes
   - Platform-specific menu handling (macOS vs Windows/Linux)

7. Add menu integration with main application:
   - Composition windows in main app window menu
   - Proper menu handling when composition window has focus
   - Menu state isolation between composition and main editor
   - Application-level menu coordination

Test that all menu items work correctly, keyboard shortcuts function properly, menu states update appropriately, and integration with the main application is seamless.
```

---

## Step 16: Error Handling and Validation

**Objective**: Implement comprehensive error handling, validation, and user feedback systems throughout the composition mode.

**Context**: This step adds robustness to the composition mode with proper error handling for all edge cases and user error scenarios.

```
Implement comprehensive error handling and validation:

1. Add file operation error handling:
   - Missing layer file detection and user notification
   - Corrupted composition file handling
   - Invalid file format detection and messaging
   - File permission and access error handling

2. Implement layer operation validation:
   - Layer selection validation before operations
   - Layer state validation for operations
   - Position boundary validation with user feedback
   - Layer count limits and performance warnings

3. Add composition validation:
   - Canvas dimension validation and limits
   - Layer count and complexity validation
   - Memory usage monitoring and warnings
   - Composition file format validation

4. Implement user error feedback:
   - Toast notifications for operation errors
   - Status bar error messages
   - Dialog boxes for critical errors
   - Inline validation messages

5. Add data integrity checks:
   - Layer data validation on load
   - Composition data consistency checks
   - File reference validation and repair
   - Automatic data corruption recovery

6. Implement graceful degradation:
   - Continue operation when non-critical errors occur
   - Fallback rendering for missing resources
   - Safe mode operation with reduced functionality
   - User choice for error recovery options

7. Add debugging and logging support:
   - Console logging for development debugging
   - Error reporting and diagnostic information
   - Performance monitoring and alerts
   - User-friendly error reporting interface

Test that all error conditions are handled gracefully, users receive clear feedback about problems, the application remains stable during errors, and recovery options work correctly.
```

---

## Step 17: Performance Optimization and Testing

**Objective**: Optimize performance for large compositions and multiple layers, and implement comprehensive testing.

**Context**: This final step ensures the composition mode performs well with realistic workloads and is thoroughly tested for production use.

```
Implement performance optimization and comprehensive testing:

1. Add performance optimization for rendering:
   - Layer rendering caching system
   - Efficient canvas update algorithms
   - Rendering throttling for smooth interaction
   - Memory management for large layers

2. Implement composition performance features:
   - Large composition handling and optimization
   - Layer count performance scaling
   - Memory usage monitoring and optimization
   - Background rendering for responsiveness

3. Add performance monitoring:
   - Rendering performance metrics
   - Memory usage tracking
   - Operation timing analysis
   - Performance warning systems

4. Implement comprehensive testing:
   - Unit tests for core composition functionality
   - Integration tests for layer operations
   - UI interaction testing
   - File format compatibility testing

5. Add stress testing capabilities:
   - Large composition testing (many layers)
   - Complex layer operation testing
   - Memory leak detection and prevention
   - Performance regression testing

6. Implement user performance features:
   - Progress indicators for long operations
   - Cancellation support for time-consuming tasks
   - Performance settings and optimization options
   - User feedback for performance issues

7. Add final quality assurance:
   - Cross-platform compatibility testing
   - Edge case testing and validation
   - User experience testing and refinement
   - Documentation and help system completion

Test that composition mode performs well with large numbers of layers, memory usage is reasonable, all functionality works reliably, and the user experience is smooth and professional.
```

---

## Testing Strategy

Each step should be tested with the following approach:

1. **Unit Testing**: Test individual functions and classes in isolation
2. **Integration Testing**: Test interaction between components
3. **User Interface Testing**: Test all UI interactions and visual feedback
4. **File Format Testing**: Test with various textmode file formats
5. **Performance Testing**: Test with large compositions and many layers
6. **Error Scenario Testing**: Test error handling and edge cases

## Success Criteria

The composition mode implementation is complete when:

1. All layer operations work correctly with proper visual feedback
2. File operations (save/load/export) work reliably
3. Performance is acceptable with reasonable layer counts
4. Error handling provides clear user feedback
5. The interface feels professional and intuitive
6. Integration with main application is seamless
7. All functionality is accessible via keyboard and menu

This implementation plan provides a comprehensive, step-by-step approach to building the composition mode feature while maintaining the quality and architectural consistency of the existing Moebius textmode art editor.