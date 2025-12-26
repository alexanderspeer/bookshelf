import { IMG_URL_PREFIX } from "../types/constants";
import { book, foundBook } from "../types/interfaces";

interface Dimensions {
  width: number;
  height: number;
}

interface FakeSpineData {
  dataURL: string;
  heightInPx: number;
  widthInPx: number;
}

export interface BookshelfRendererParams {
  books: (foundBook | book)[],
  shelfWidthInches?: number,
  shelfHeightInches?: number,
  borderWidthInches?: number,
  shelfBgColor?: string,
  shelfFgColor?: string,
  bookScaleFactor?: number,
  shelfLabels?: string[],
  cascadeDelayMs?: number, // Delay between rendering each book (default: 0)
  spineFont?: string, // Font family for book spine text
}

interface BookPosition {
  book: foundBook | book;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BookshelfRenderer {
  books: (foundBook | book)[] = [];
  // can be manually overriden - no params needed, access canvas directly via getCanvas()
  inProgressRenderCallback: (() => void) | null = null;
  // Track book positions for interactivity
  bookPositions: BookPosition[] = [];

  public get borderWidthInches() { return this._borderWidthInches; }
  set borderWidthInches(borderWidthInches: number) {
    this._borderWidthInches = borderWidthInches;
    this.borderWidth = borderWidthInches * this.inchPixelRatio;
    this.recalculateStartingPositions();
  }
  private _borderWidthInches = 1;
  private borderWidth: number;

  public get shelfWidthInches() { return this._shelfWidthInches; }
  set shelfWidthInches(widthInches: number) {
    this._shelfWidthInches = widthInches;
    this.shelfWidth = this.shelfWidthInches * this.inchPixelRatio;
    if (this.canvas) {
      this.canvas.width = this.shelfWidth;
    }
  }
  private _shelfWidthInches = 30;
  private shelfWidth: number;

  public get shelfHeightInches() { return this._shelfHeightInches; }
  set shelfHeightInches(heightInches: number) {
    this._shelfHeightInches = heightInches;
    this.shelfHeight = this.shelfHeightInches * this.inchPixelRatio;
    this.recalculateStartingPositions();
  }
  private _shelfHeightInches = 10.5;
  private shelfHeight: number;

  private inchPixelRatio = 60;

  // the number of shelves is dynamic. A new shelf should be added after each row is completed.
  // TODO: Allow for max number of vertical shelves, then go horizontal.
  private shelfBgColor = "#8B6F47"; // Warm brown tone
  private shelfFgColor = "#5C4033"; // Darker brown for borders
  private bookScaleFactor = 1.0; // Scale factor for book sizes
  private spineFont = "serif"; // Font family for book spine text
  private shelfLabels: string[] = []; // Labels for each shelf
  private cascadeDelayMs = 0; // Delay between rendering each book
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private leftStart = 0;
  private leftCurrent = 0;
  private bottomStart = 0;
  private bottomCurrent = 0;
  private currentShelfIndex = 0;
  private fakeSpineCache: Map<string, FakeSpineData> = new Map();

  constructor(params: BookshelfRendererParams) {
    Object.assign(this, params);
    this.shelfWidth = this.shelfWidthInches * this.inchPixelRatio;
    this.shelfHeight = this.shelfHeightInches * this.inchPixelRatio;
    this.borderWidth = this.borderWidthInches * this.inchPixelRatio;

    // same content as recalculateStartingPositions
    this.recalculateStartingPositions();

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.shelfWidth;
    this.canvas.height = 0;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  private recalculateStartingPositions(): void {
    this.leftStart = this.borderWidth;
    this.leftCurrent = this.leftStart;
    this.bottomStart = this.shelfHeight + this.borderWidth;
    this.bottomCurrent = this.bottomStart;
  }

  public async render(): Promise<string> {
    // Reset all state for new render
    this.currentShelfIndex = 0;
    this.bookPositions = [];
    this.canvas.height = 0; // Reset canvas
    this.recalculateStartingPositions(); // Reset positions
    
    await this.addNewShelfRow();
    await this.loadSpines();
    return this.canvas.toDataURL("image/jpeg"); // to save space
  }

  private convertInchesToPx(inches: number): number {
    return inches * this.inchPixelRatio;
  }

  private convertBookDimensionsToPx(book: foundBook): Dimensions {
    const dimensions = book.dimensions.toLowerCase().split('x');
    const pxValues = dimensions.map(dimension => {
      const floatValue = Number(dimension.trim());
      return this.convertInchesToPx(floatValue);
    }).sort((a: number, b: number) => a - b);
    // smallest value should be spine width, largest should be height
    // Apply scale factor to make books smaller/larger
    return {
      width: pxValues[0] * this.bookScaleFactor,
      height: pxValues[2] * this.bookScaleFactor,
    }
  }

  private addNewShelfRow = async (): Promise<void> => {
    const initialHeight = this.canvas.height;
    let image = null;
    let additionalHeight = this.shelfHeight + (this.borderWidth * 2);
    let bottomBorderStart = this.shelfHeight + initialHeight + this.borderWidth;
    let borderTopStart = 0;
    if (initialHeight > 0) {
      // this means something has already been rendered.
      // changing the canvas size erases what was there previously
      // so we'll store what has been genereated so far and replace it after changing the height
      image = new Image();
      image.src = this.canvas.toDataURL("image/png");
      await image.decode();
      // we need to remove borderWidth on every row after the first because
      // the bottom of the previous row and the top of this row are the same line
      additionalHeight -= this.borderWidth;
      bottomBorderStart -= this.borderWidth;
      borderTopStart = initialHeight - this.borderWidth;
    }
    this.canvas.height = initialHeight + additionalHeight;
    if (image !== null) {
      this.ctx.drawImage(image, 0, 0);
    }
  
    // draw background
    this.ctx.fillStyle = this.shelfBgColor;
    this.ctx.fillRect(0, initialHeight, this.shelfWidth, additionalHeight);
    // draw borders
    this.ctx.fillStyle = this.shelfFgColor;
    // left border
    this.ctx.fillRect(0, initialHeight, this.borderWidth, additionalHeight);
    // right border
    this.ctx.fillRect(this.shelfWidth - this.borderWidth, initialHeight, this.borderWidth, additionalHeight);
    // top border
    // (we only need to draw this on the first row)
    if (borderTopStart === 0) {
      this.ctx.fillRect(0, borderTopStart, this.shelfWidth, this.borderWidth);
    }
    // bottom border
    this.ctx.fillRect(0, bottomBorderStart, this.shelfWidth, this.borderWidth);
  
    // Add shelf label if available
    if (this.shelfLabels && this.shelfLabels[this.currentShelfIndex]) {
      const label = this.shelfLabels[this.currentShelfIndex];
      const labelY = initialHeight + this.borderWidth + 20; // Position label near top of shelf
      
      this.ctx.save();
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.strokeStyle = '#5C4033';
      this.ctx.lineWidth = 2;
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      
      // Draw text with outline for visibility
      const labelX = this.borderWidth + 10;
      this.ctx.strokeText(label, labelX, labelY);
      this.ctx.fillText(label, labelX, labelY);
      this.ctx.restore();
    }
    
    this.currentShelfIndex++;
  
    if (this.inProgressRenderCallback != null) {
      this.inProgressRenderCallback();
    }
  }

  private loadSpines = async (): Promise<void> => {
    for (const book of this.books) {
      const spine = new Image();
      spine.crossOrigin = "anonymous";
      let dimensions;
      
      // Check if this is a bookend marker
      if (book.title === '__BOOKEND__' && book.author === '__BOOKEND__') {
        const bookendData = this.generateBookend();
        spine.src = bookendData.dataURL;
        dimensions = { height: bookendData.heightInPx, width: bookendData.widthInPx };
      } else if ('fileName' in book && book.fileName != null) {
        spine.src = IMG_URL_PREFIX + book.fileName;
        dimensions = this.convertBookDimensionsToPx(book);
      } else { // we're generating a fake spine
        const fakeSpineData = this.generateFakeSpine(book);
        spine.src = fakeSpineData.dataURL;
        dimensions = { height: fakeSpineData.heightInPx, width: fakeSpineData.widthInPx }
      }
      // wait for image to load
      await spine.decode();
      if (this.leftCurrent + dimensions.width > this.shelfWidth - this.borderWidth) {
        this.leftCurrent = this.borderWidth;
        this.bottomCurrent += this.shelfHeight + this.borderWidth;
        await this.addNewShelfRow();
      }
  
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

      // because canvas places the image from the top-left corner, we need to add the calculated height to the bottom
      this.ctx.drawImage(spine, bookX, bookY, dimensions.width, dimensions.height);
      this.leftCurrent += dimensions.width;

      if (this.inProgressRenderCallback != null) {
        // Call callback without expensive base64 conversion - access canvas directly!
        this.inProgressRenderCallback();
        
        // Add delay between books if cascadeDelayMs is set
        if (this.cascadeDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.cascadeDelayMs));
        }
      }
    }
  }
  
  public getBookPositions(): BookPosition[] {
    return this.bookPositions;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private getAuthorLastName(author: string): string {
    const authorNames = author.split(' ');
    return authorNames[authorNames.length - 1]; // this won't work if they're a JR or something
  }

  private getRandomFloatInIntRange(minimum: number, maximum: number): number {
    return (Math.random() * (maximum - minimum)) + minimum;
  }

  private getBookCacheKey(book: book): string {
    // Create a unique key for each book based on title and author
    return `${book.title}||${book.author}`;
  }

  private seededRandom(seed: number): number {
    // Simple seeded random number generator (mulberry32)
    let t = seed + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  private stringToSeed(str: string): number {
    // Convert string to a numeric seed
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private calculateStringFontSizeInRange(stringValue: string,
                                 font: string,
                                 startingFontSize: number,
                                 minWidthInPx: number,
                                 maxWidthInPx: number,
                                 maxHeightInPx: number,
                                 ctx: CanvasRenderingContext2D
  ): TextMetrics {
    let currentFontSize = startingFontSize;
    let validMeasuredText = null;
    // note, this could loop infinitely if the string is too short. It will grow vertically beyond the box, then be shrunk but it isn't big enough yet,
    while (validMeasuredText == null) {
      ctx.font = currentFontSize.toString() + "px " + font;
      let measuredText = ctx.measureText(stringValue);
      if (measuredText.fontBoundingBoxAscent >= maxHeightInPx || measuredText.width > maxWidthInPx) {
        currentFontSize -= 1;
        continue;
      }
      else if (measuredText.width < minWidthInPx) {
        currentFontSize += 1;
        continue;
      }
      validMeasuredText = measuredText;
    }
    return validMeasuredText;
  }

  private generateBookend(): FakeSpineData {
    // Check cache first
    const renderVersion = 'v4-simple'; // Match version with generateFakeSpine
    const cacheKey = '__BOOKEND__' + '||' + renderVersion;
    if (this.fakeSpineCache.has(cacheKey)) {
      return this.fakeSpineCache.get(cacheKey)!;
    }

    // create a new canvas
    const spineCanvas = document.createElement("canvas");

    // Make bookend taller (90% of shelf height) and thicker than regular books
    const heightInPx = Math.floor(this.convertInchesToPx(this.shelfHeightInches * 0.9));
    const widthInPx = Math.floor(this.convertInchesToPx(1.5)); // 1.5 inches wide
    
    spineCanvas.width = widthInPx;
    spineCanvas.height = heightInPx;
    const spineCtx = spineCanvas.getContext("2d") as CanvasRenderingContext2D;
    
    // Use the same brown color as the shelf border (shelfFgColor = "#5C4033")
    spineCtx.fillStyle = this.shelfFgColor;
    spineCtx.fillRect(0, 0, widthInPx, heightInPx);

    // Keep bookend simple for now
    // Add subtle border
    spineCtx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    spineCtx.lineWidth = 2;
    spineCtx.strokeRect(1, 1, widthInPx - 2, heightInPx - 2);

    // convert to dataUrl
    const b64 = spineCanvas.toDataURL("image/png");

    // return object with dataurl string, heightInPx and widthInPx 
    const bookendData = {
      dataURL: b64,
      heightInPx: heightInPx,
      widthInPx: widthInPx,
    };

    // Cache the generated bookend
    this.fakeSpineCache.set(cacheKey, bookendData);

    return bookendData;
  }

  private generateFakeSpine(incompleteBook: book): FakeSpineData {
    // Check cache first - include domColor and version in cache key
    // Version helps invalidate cache when rendering logic changes
    const renderVersion = 'v6-final'; // Increment when changing rendering logic
    const cacheKey = this.getBookCacheKey(incompleteBook) + '||' + (incompleteBook.domColor || 'default') + '||' + renderVersion;
    if (this.fakeSpineCache.has(cacheKey)) {
      return this.fakeSpineCache.get(cacheKey)!;
    }

    // Generate seed from book title and author for consistent results
    const seed = this.stringToSeed(this.getBookCacheKey(incompleteBook));
    
    // create a new canvas
    const spineCanvas = document.createElement("canvas");

    // Come up with dimensions using seeded random for consistency
    const MINIMUM_HEIGHT_INCHES = 6.5;
    const MAXIMUM_HEIGHT_INCHES = this.shelfHeightInches - 1; // 1 inch shorter than shelf height
    const MINIMUM_WIDTH_INCHES = .75;
    const MAXIMUM_WIDTH_INCHES = 2;

    // Use seeded random for consistent dimensions
    const heightRandom = this.seededRandom(seed);
    const widthRandom = this.seededRandom(seed + 1);
    
    const widthInPx = Math.floor(this.convertInchesToPx(MINIMUM_WIDTH_INCHES + widthRandom * (MAXIMUM_WIDTH_INCHES - MINIMUM_WIDTH_INCHES)));
    const heightInPx = Math.floor(this.convertInchesToPx(MINIMUM_HEIGHT_INCHES + heightRandom * (MAXIMUM_HEIGHT_INCHES - MINIMUM_HEIGHT_INCHES)));
    
    // inverse height and width so the book is laying on its side (easier for writing text)
    spineCanvas.height = widthInPx;
    spineCanvas.width = heightInPx;
    const spineCtx = spineCanvas.getContext("2d") as CanvasRenderingContext2D;
    
    // Use custom domColor if provided, otherwise select from preset colors
    let backgroundColor: string;
    if (incompleteBook.domColor && incompleteBook.domColor !== '#888888') {
      // Use the custom color
      backgroundColor = incompleteBook.domColor;
    } else {
      // select background color using seeded random for consistency
      // Using muted, natural book colors with variety (browns, blues, reds, greens, etc.)
      // All colors are light enough for black text to be readable
      const COLORS = [
          // Browns & Tans
          {bg: "#E8DCC4", fg: "#000000"}, // Soft beige/cream
          {bg: "#D4C5B9", fg: "#000000"}, // Light taupe
          {bg: "#C9B8A8", fg: "#000000"}, // Warm grey-brown
          {bg: "#C8B6A6", fg: "#000000"}, // Sandy brown
          {bg: "#B8A898", fg: "#000000"}, // Dusty brown
          
          // Blues
          {bg: "#A8B8C8", fg: "#000000"}, // Muted slate blue
          {bg: "#B5C4D8", fg: "#000000"}, // Soft powder blue
          {bg: "#9EAEC0", fg: "#000000"}, // Dusty blue-grey
          {bg: "#C5D3E0", fg: "#000000"}, // Pale sky blue
          {bg: "#8B9DAF", fg: "#000000"}, // Weathered blue
          
          // Reds & Burgundies
          {bg: "#C89B9B", fg: "#000000"}, // Dusty rose
          {bg: "#B89090", fg: "#000000"}, // Muted terracotta
          {bg: "#D4A8A8", fg: "#000000"}, // Soft mauve
          {bg: "#C08080", fg: "#000000"}, // Faded burgundy
          {bg: "#B8A0A0", fg: "#000000"}, // Warm grey-rose
          
          // Greens
          {bg: "#A8B8A0", fg: "#000000"}, // Sage green
          {bg: "#9BAA92", fg: "#000000"}, // Muted olive
          {bg: "#B5C4B0", fg: "#000000"}, // Soft mint
          {bg: "#8FA088", fg: "#000000"}, // Dark sage
          {bg: "#A0AFA0", fg: "#000000"}, // Weathered green
          
          // Greys & Neutrals
          {bg: "#BFB5A8", fg: "#000000"}, // Stone grey
          {bg: "#C0C0B8", fg: "#000000"}, // Warm grey
          {bg: "#B0B0A8", fg: "#000000"}, // Silver-beige
          {bg: "#D0D0C8", fg: "#000000"}, // Light ash
      ];
      // Select color using seeded random for consistency
      const colorRandom = this.seededRandom(seed + 2);
      const selectedColor = COLORS[Math.floor(colorRandom * COLORS.length)];
      backgroundColor = selectedColor.bg;
    }
    
    // Draw main background - keep it simple for alignment
    spineCtx.fillStyle = backgroundColor;
    spineCtx.fillRect(0, 0, heightInPx, widthInPx);

    // LAST NAME
    // extract authors last name from the book
    const lastName = this.getAuthorLastName(incompleteBook.author);

    // Use individual book font if specified, otherwise use theme font or default to serif
    const font = incompleteBook.spineFont || this.spineFont;

    // keep calculating the font until its between 20-25% of the spine
    const MIN_NAME_WIDTH = 0;
    const MAX_NAME_WIDTH = Math.floor(heightInPx * .25);
    let validMeasuredNameText = this.calculateStringFontSizeInRange(lastName, font, 48, MIN_NAME_WIDTH, MAX_NAME_WIDTH, widthInPx - 8, spineCtx);

    // Determine text color based on background brightness for better visibility
    const getBrightness = (hexColor: string): number => {
      const rgb = parseInt(hexColor.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >>  8) & 0xff;
      const b = (rgb >>  0) & 0xff;
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    
    const brightness = getBrightness(backgroundColor);
    const isDark = brightness < 128;
    
    // Use high contrast colors with strong outline
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const outlineColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';

    // place the last name on the spine with RPG-style text outline
    const NAME_PADDING_RIGHT = 10;
    const nameXPosition = heightInPx - validMeasuredNameText.width - NAME_PADDING_RIGHT;
    const nameYPosition = widthInPx - Math.ceil((widthInPx - validMeasuredNameText.fontBoundingBoxAscent) / 2);
    
    // Draw text with outline for visibility
    spineCtx.strokeStyle = outlineColor;
    spineCtx.lineWidth = 2.5;
    spineCtx.lineJoin = 'round';
    spineCtx.strokeText(lastName, nameXPosition, nameYPosition);
    
    spineCtx.fillStyle = textColor;
    spineCtx.fillText(lastName, nameXPosition, nameYPosition);

    // TITLE
    let title = incompleteBook.title;
    // goodreads includes series info like so "Title (Series, #2)"
    // so if there's a parenthesis, we'll cut everything out. If the titles has parens those will be removed, but kind of an edge case.
    const indexOfParen = title.indexOf('(');
    if (indexOfParen > 0) { title = title.slice(0, indexOfParen - 1); }

    // get text between 50-70% of spine width
    // TODO: if title is longer than certain number of chars (and has above certain number of white space) divide to two lines
    const MIN_TITLE_WIDTH = 0; // No minimum width (in case title is short)
    const MAX_TITLE_WIDTH = Math.floor(heightInPx * .7) - 10;
    let validMeasuredTitleText = this.calculateStringFontSizeInRange(title, font, 60, MIN_TITLE_WIDTH, MAX_TITLE_WIDTH, widthInPx - 6, spineCtx);

    // place title on spine with RPG-style text outline
    const titleXPosition = Math.floor((MAX_TITLE_WIDTH - validMeasuredTitleText.width) / 2) + 10;
    const titleYPosition = widthInPx - Math.ceil((widthInPx - validMeasuredNameText.fontBoundingBoxAscent) / 2);
    
    // Draw text with outline for visibility
    spineCtx.strokeStyle = outlineColor;
    spineCtx.lineWidth = 2.5;
    spineCtx.lineJoin = 'round';
    spineCtx.strokeText(title, titleXPosition, titleYPosition);
    
    spineCtx.fillStyle = textColor;
    spineCtx.fillText(title, titleXPosition, titleYPosition);

    // rotate
    this.rotateCanvas90(spineCanvas);

    // convert to dataUrl
    const b64 = spineCanvas.toDataURL("image/png");

    // return object with dataurl string, heightInPx and widthInPx 
    const fakeSpineData = {
      dataURL: b64,
      heightInPx: heightInPx,
      widthInPx: widthInPx,
    };

    // Cache the generated spine data (cacheKey already declared at top of function)
    this.fakeSpineCache.set(cacheKey, fakeSpineData);

    return fakeSpineData;
  }

  private getRandomHexColor(): string {
    // Generate a random number between 0 and 16777215 (FFFFFF in decimal)
    const randomNumber = Math.floor(Math.random() * 16777216);
  
    // Convert the random number to a hexadecimal string
    const hexString = randomNumber.toString(16);
  
    // Pad the hexadecimal string with leading zeros if necessary
    const paddedHexString = hexString.padStart(6, '0');
  
    // Return the hexadecimal color code with a "#" prefix
    return `#${paddedHexString}`;
  }

  private rotateCanvas90(canvas: HTMLCanvasElement): void {
    const width = canvas.width;
    const height = canvas.height;
  
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d') as CanvasRenderingContext2D;
    tempCtx.drawImage(canvas, 0, 0);
  
    canvas.width = height; // Swap width and height
    canvas.height = width;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  
    ctx.translate(canvas.width / 2, canvas.height / 2); // Translate to center
    ctx.rotate(Math.PI / 2); // Rotate 90 degrees
    // draw the rotated image
    ctx.drawImage(tempCanvas, -width / 2, -height / 2, width, height);
    ctx.translate(-canvas.width / 2, -canvas.height / 2); // Translate back
  }

}