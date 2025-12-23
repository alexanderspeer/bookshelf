# Bookshelf Hover/Selection Position Detection Bug - Fix Request

**QUICK SUMMARY**: Book position detection is broken - red debug rectangles don't align with books, hover selects wrong book. Likely caused by CSS scaling (`max-width: 100%`) creating mismatch between canvas internal dimensions and displayed size.

---

## Problem Summary
The bookshelf app has a critical bug where book position detection for hover effects and click selection is completely broken. Red debug rectangles (showing detected book positions) do NOT align with the actual books on the canvas - they are shifted and larger than the actual books.

## Current Behavior
1. **Red debug rectangles** (drawn at `bookPositions` coordinates) are **shifted and larger** than actual books
2. **Hover detection** selects the **wrong book** (often the book next to the one being hovered)
3. **Click selection** doesn't work correctly due to wrong positions
4. **Hover effect** lifts the wrong book or shows artifacts

## What's Been Tried (All Failed)
1. ✅ Fixed `bookPositions` array not being cleared between renders
2. ✅ Verified canvas dimensions match between renderer and display
3. ✅ Added debug logging (positions don't match visual books)
4. ✅ Checked `bookScaleFactor` application (not the issue)
5. ✅ Simplified hover effect drawing
6. ✅ Fixed event handler canvas references

## Key Files

### 1. `/bookshelf-ts-site/src/utils/BookshelfRenderer.ts`
- **Purpose**: Renders books onto a canvas and tracks their positions
- **Key Method**: `loadSpines()` - draws books and records positions at lines 226-235:
```typescript
// Store book position for interactivity
const bookX = this.leftCurrent;
const bookY = this.bottomCurrent - dimensions.height;
this.bookPositions.push({
  book: book,
  x: bookX,
  y: bookY,
  width: dimensions.width,
  height: dimensions.height
});

// Draw the book
this.ctx.drawImage(spine, bookX, bookY, dimensions.width, dimensions.height);
```

**Key Variables:**
- `this.leftCurrent` - X position (starts at `borderWidth`)
- `this.bottomCurrent` - Y position (starts at `shelfHeight + borderWidth`)
- `dimensions.width` and `dimensions.height` - book size
- `this.shelfWidth` - canvas width
- `this.borderWidth` - border thickness

### 2. `/bookshelf-ts-site/src/pages/Home.tsx`
- **Purpose**: Displays the bookshelf and handles hover/click events
- **Hover Detection** (lines 360-375):
```typescript
const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
  if (!hoverCanvasRef.current || bookPositions.length === 0) return;
  
  const canvas = hoverCanvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const hovered = bookPositions.find(pos => 
    x >= pos.x && x <= pos.x + pos.width &&
    y >= pos.y && y <= pos.y + pos.height
  );
```

- **Debug Visualization** (lines 430-441):
```typescript
// Draw semi-transparent rectangles over each book position
ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
ctx.lineWidth = 2;
bookPositions.forEach(pos => {
  ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
});
```

## Technical Details

### Canvas Setup
- **Renderer canvas**: Created in `BookshelfRenderer` constructor
- **Display canvas**: `canvasRef` in Home.tsx - copies from renderer canvas
- **Hover canvas**: `hoverCanvasRef` - overlay for hover effects
- All canvases should have matching dimensions

### Position Calculation
- Books are drawn at: `(leftCurrent, bottomCurrent - height)`
- Positions stored as: `{ x: leftCurrent, y: bottomCurrent - height, width, height }`
- `bottomCurrent` increases when new shelf row is added
- `leftCurrent` resets to `borderWidth` when row wraps

### Coordinate System
- Canvas uses pixel coordinates (0,0 at top-left)
- Y increases downward
- Books are positioned from their top-left corner
- `bottomCurrent` represents the bottom of the shelf, so book Y = `bottomCurrent - height`

## What Needs to Be Fixed

1. **Position coordinates don't match visual books** - Red rectangles are shifted/wrong size
2. **Hover detection finds wrong book** - Often detects adjacent book
3. **Hover effect lifts wrong book** - Visual feedback doesn't match hovered book

## Debug Information Available
- Console logs show: canvas dimensions, book positions, mouse coordinates
- Red rectangles visually show detected positions
- Console shows which book title is detected on hover

## Critical CSS Issue Found
The canvas has CSS scaling applied:
```css
.bookshelf-canvas {
  max-width: 100%;
  height: auto;
  display: block;
}
```
This means the canvas is **visually scaled down** by CSS while the internal canvas dimensions remain at full size. This could cause a mismatch between:
- Internal canvas coordinates (e.g., 3000px wide)
- Displayed size (e.g., 800px wide due to CSS)
- Mouse coordinates (relative to displayed size)

The mouse coordinate scaling in `handleCanvasMouseMove` attempts to handle this:
```typescript
const scaleX = canvas.width / rect.width;
const scaleY = canvas.height / rect.height;
```
But this might not be working correctly if canvases have different internal vs displayed sizes.

## Request
Please systematically trace through the entire rendering and position tracking flow to find where the mismatch occurs. Check:
1. **CSS scaling mismatch** - Are canvas internal dimensions different from displayed dimensions?
2. Are positions calculated correctly when books are drawn?
3. Are canvas dimensions consistent throughout (renderer, display, hover)?
4. Is coordinate scaling correct in mouse event handlers?
5. Are there any CSS transforms or scaling affecting the canvas display?
6. Could there be a timing issue where positions are read before they're updated?
7. **Verify**: Do `canvas.width` and `canvas.getBoundingClientRect().width` match? If not, that's the bug!

Fix the position detection so that:
- Red debug rectangles perfectly align with books
- Hover detects the correct book
- Click selection works correctly
- Hover effect lifts the correct book

