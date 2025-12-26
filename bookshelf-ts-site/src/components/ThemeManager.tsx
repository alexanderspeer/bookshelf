import React, { useState } from 'react';
import { Theme, Book } from '../types/types';
import '../styles/thememanager.css';

interface ThemeManagerProps {
  currentTheme: Theme;
  savedThemes: Theme[];
  allBooks: Book[];
  onApplyTheme: (theme: Theme) => void;
  onSaveTheme: (theme: Theme) => void;
  onDeleteTheme: (themeId: string) => void;
  onUpdateShelfColors: (bgColor: string, fgColor: string) => void;
  onApplyBulkBookColors: (colorScheme: string) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  // Browns & Woods
  '#8B6F47', '#5C4033', '#A0826D', '#6F4E37', '#C19A6B',
  // Blues
  '#2C5282', '#2B6CB0', '#3182CE', '#63B3ED', '#5DADE2',
  // Greens
  '#2F855A', '#38A169', '#48BB78', '#68D391', '#9AE6B4',
  // Reds & Burgundy
  '#742A2A', '#9B2C2C', '#C53030', '#E53E3E', '#F56565',
  // Purples
  '#44337A', '#553C9A', '#6B46C1', '#805AD5', '#9F7AEA',
  // Grays & Neutrals
  '#1A202C', '#2D3748', '#4A5568', '#718096', '#A0AEC0',
  // Warm Colors
  '#C05621', '#DD6B20', '#ED8936', '#F6AD55', '#FBD38D',
  // Pastels
  '#D6BCFA', '#B794F4', '#E9D8FD', '#FED7D7', '#FBB6CE',
];

const AVAILABLE_FONTS = [
  { name: 'Serif (Classic)', value: 'serif' },
  { name: 'Sans-Serif (Modern)', value: 'sans-serif' },
  { name: 'Monospace (Typewriter)', value: 'monospace' },
  { name: 'Cursive (Elegant)', value: 'cursive' },
  { name: 'Fantasy (Decorative)', value: 'fantasy' },
  { name: 'Georgia (Traditional)', value: 'Georgia, serif' },
  { name: 'Times New Roman (Formal)', value: '"Times New Roman", Times, serif' },
  { name: 'Palatino (Literary)', value: '"Palatino Linotype", Palatino, serif' },
  { name: 'Garamond (Classic)', value: 'Garamond, serif' },
  { name: 'Bookman (Sturdy)', value: '"Bookman Old Style", serif' },
  { name: 'Arial (Clean)', value: 'Arial, sans-serif' },
  { name: 'Helvetica (Swiss)', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Verdana (Readable)', value: 'Verdana, sans-serif' },
  { name: 'Tahoma (Compact)', value: 'Tahoma, Geneva, sans-serif' },
  { name: 'Trebuchet MS (Modern)', value: '"Trebuchet MS", sans-serif' },
  { name: 'Century Gothic (Geometric)', value: '"Century Gothic", sans-serif' },
  { name: 'Courier New (Fixed)', value: '"Courier New", Courier, monospace' },
  { name: 'Lucida Console (Tech)', value: '"Lucida Console", Monaco, monospace' },
  { name: 'Comic Sans MS (Playful)', value: '"Comic Sans MS", cursive' },
  { name: 'Brush Script (Handwritten)', value: '"Brush Script MT", cursive' },
  { name: 'Papyrus (Ancient)', value: 'Papyrus, fantasy' },
  { name: 'Impact (Bold)', value: 'Impact, fantasy' },
  { name: 'Copperplate (Engraved)', value: 'Copperplate, fantasy' },
];

// Pre-made complete themes with coordinated book color palettes
// Book colors are chosen to contrast with shelf colors (not too similar)
const PREMADE_THEMES: Theme[] = [
  {
    id: 'vintage-library',
    name: 'Vintage Library',
    shelfBgColor: '#8B6F47', // Medium brown
    shelfFgColor: '#5C4033',  // Dark brown
    bookColors: [],
    // Books: Lighter creams/beiges and some accent colors (avoiding medium browns)
    bookColorPalette: ['#F5E6D3', '#E8DCC4', '#D4A5A5', '#C5D3E0', '#A8B8A0', '#E0BBE4'],
    spineFont: 'Garamond, serif',
    isDefault: false,
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    shelfBgColor: '#2D3748', // Dark gray
    shelfFgColor: '#1A202C',  // Very dark gray
    bookColors: [],
    // Books: Light colors and vibrant accents (avoiding dark grays)
    bookColorPalette: ['#E2E8F0', '#CBD5E0', '#A0AEC0', '#63B3ED', '#F6AD55', '#FC8181'],
    spineFont: 'Helvetica, Arial, sans-serif',
    isDefault: false,
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    shelfBgColor: '#2C5282', // Medium-dark blue
    shelfFgColor: '#2B6CB0',  // Medium blue
    bookColors: [],
    // Books: Light blues, teals, and warm contrasts (avoiding medium blues)
    bookColorPalette: ['#E0F2F7', '#B3E5FC', '#80DEEA', '#FBD38D', '#FFD7BE', '#FFE0E0'],
    spineFont: 'Verdana, sans-serif',
    isDefault: false,
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    shelfBgColor: '#38A169', // Medium green
    shelfFgColor: '#2F855A',  // Medium-dark green
    bookColors: [],
    // Books: Light greens, yellows, and earth tones (avoiding medium greens)
    bookColorPalette: ['#E6F7E6', '#C6F6D5', '#F0E68C', '#E8DCC4', '#D4A5A5', '#C7CEEA'],
    spineFont: '"Palatino Linotype", Palatino, serif',
    isDefault: false,
  },
  {
    id: 'sunset-warmth',
    name: 'Sunset Warmth',
    shelfBgColor: '#DD6B20', // Bright orange
    shelfFgColor: '#C05621',  // Dark orange
    bookColors: [],
    // Books: Yellows, corals, pinks (avoiding oranges)
    bookColorPalette: ['#FFFACD', '#FFE4B5', '#FFB6C1', '#F08080', '#E6E6FA', '#FFE4E1'],
    spineFont: '"Brush Script MT", cursive',
    isDefault: false,
  },
  {
    id: 'lavender-dreams',
    name: 'Lavender Dreams',
    shelfBgColor: '#805AD5', // Medium purple
    shelfFgColor: '#6B46C1',  // Dark purple
    bookColors: [],
    // Books: Light purples, pinks, blues (avoiding medium purples)
    bookColorPalette: ['#F3E5F5', '#E1BEE7', '#FFE0F0', '#E0F2F7', '#FFF9C4', '#FFE0B2'],
    spineFont: 'Georgia, serif',
    isDefault: false,
  },
  {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    shelfBgColor: '#718096', // Medium gray
    shelfFgColor: '#4A5568',  // Dark gray
    bookColors: [],
    // Books: Very light grays/whites and subtle pastels (avoiding medium grays)
    bookColorPalette: ['#FFFFFF', '#F7FAFC', '#E2E8F0', '#E8F4F8', '#FFF5E1', '#FFE4E4'],
    spineFont: '"Century Gothic", sans-serif',
    isDefault: false,
  },
];

export const ThemeManager: React.FC<ThemeManagerProps> = ({
  currentTheme,
  savedThemes,
  allBooks,
  onApplyTheme,
  onSaveTheme,
  onDeleteTheme,
  onUpdateShelfColors,
  onApplyBulkBookColors,
  onClose,
}) => {
  const [themeName, setThemeName] = useState('');
  const [selectedBgColor, setSelectedBgColor] = useState(currentTheme.shelfBgColor);
  const [selectedFgColor, setSelectedFgColor] = useState(currentTheme.shelfFgColor);
  const [customBgColor, setCustomBgColor] = useState(currentTheme.shelfBgColor);
  const [customFgColor, setCustomFgColor] = useState(currentTheme.shelfFgColor);
  const [selectedBookColors, setSelectedBookColors] = useState<string[]>([]);
  const [selectedFont, setSelectedFont] = useState(currentTheme.spineFont || 'serif');
  const [activeTab, setActiveTab] = useState<'colors' | 'bookColors' | 'fonts' | 'premade' | 'themes'>('colors');

  const handleApplyColors = () => {
    onUpdateShelfColors(selectedBgColor, selectedFgColor);
    
    // Apply book colors if any are selected
    if (selectedBookColors.length > 0) {
      const newBookColors = allBooks.map((book, index) => ({
        bookId: book.id!,
        color: selectedBookColors[index % selectedBookColors.length]
      })).filter(bc => bc.bookId !== undefined);
      
      // Create a temporary theme with these colors and apply it
      const tempTheme: Theme = {
        ...currentTheme,
        shelfBgColor: selectedBgColor,
        shelfFgColor: selectedFgColor,
        bookColors: newBookColors,
        spineFont: selectedFont,
      };
      onApplyTheme(tempTheme);
    } else {
      // Just update font if no book colors
      const tempTheme: Theme = {
        ...currentTheme,
        shelfBgColor: selectedBgColor,
        shelfFgColor: selectedFgColor,
        spineFont: selectedFont,
      };
      onApplyTheme(tempTheme);
    }
  };

  const toggleBookColor = (color: string) => {
    setSelectedBookColors(prev => {
      if (prev.includes(color)) {
        return prev.filter(c => c !== color);
      } else if (prev.length < 6) {
        return [...prev, color];
      }
      return prev;
    });
  };

  const handleSaveAsTheme = () => {
    if (!themeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    // If book colors were selected in this tab, generate book color overrides
    let bookColorsToSave = currentTheme.bookColors;
    let bookColorPaletteToSave = undefined;
    
    if (selectedBookColors.length > 0) {
      // Create book colors from selected palette
      const newBookColors = allBooks.map((book, index) => ({
        bookId: book.id!,
        color: selectedBookColors[index % selectedBookColors.length]
      })).filter(bc => bc.bookId !== undefined);
      
      bookColorsToSave = newBookColors;
      bookColorPaletteToSave = selectedBookColors;
    }

    const newTheme: Theme = {
      id: Date.now().toString(),
      name: themeName,
      shelfBgColor: selectedBgColor,
      shelfFgColor: selectedFgColor,
      bookColors: bookColorsToSave,
      bookColorPalette: bookColorPaletteToSave,
      spineFont: selectedFont,
      isDefault: false,
    };

    onSaveTheme(newTheme);
    setThemeName('');
    setSelectedBookColors([]); // Reset selected book colors
    alert('Theme saved successfully!');
  };

  const handleApplyTheme = (theme: Theme) => {
    // If theme has a book color palette, apply it to all books
    if (theme.bookColorPalette && theme.bookColorPalette.length > 0) {
      const newBookColors = allBooks.map((book, index) => ({
        bookId: book.id!,
        color: theme.bookColorPalette![index % theme.bookColorPalette!.length]
      })).filter(bc => bc.bookId !== undefined);
      
      const themeWithColors: Theme = {
        ...theme,
        bookColors: newBookColors,
      };
      onApplyTheme(themeWithColors);
    } else {
      onApplyTheme(theme);
    }
    
    setSelectedBgColor(theme.shelfBgColor);
    setSelectedFgColor(theme.shelfFgColor);
    setSelectedFont(theme.spineFont || 'serif');
  };

  return (
    <div className="theme-manager-overlay" onClick={onClose}>
      <div className="theme-manager-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Bookshelf Theme Manager</h2>

        <div className="theme-tabs">
          <button
            className={activeTab === 'colors' ? 'active' : ''}
            onClick={() => setActiveTab('colors')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Shelf Colors
          </button>
          <button
            className={activeTab === 'bookColors' ? 'active' : ''}
            onClick={() => setActiveTab('bookColors')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Book Colors
          </button>
          <button
            className={activeTab === 'fonts' ? 'active' : ''}
            onClick={() => setActiveTab('fonts')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Fonts
          </button>
          <button
            className={activeTab === 'premade' ? 'active' : ''}
            onClick={() => setActiveTab('premade')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            Pre-Made Themes
          </button>
          <button
            className={activeTab === 'themes' ? 'active' : ''}
            onClick={() => setActiveTab('themes')}
            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
          >
            My Themes
          </button>
        </div>

        {activeTab === 'colors' && (
          <div className="theme-content">
            <div className="color-section">
              <h3>Shelf Background Color</h3>
              <div className="color-picker-section">
                <div className="preset-colors">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-swatch ${selectedBgColor === color ? 'selected' : ''}`}
                      style={{ 
                        backgroundColor: color,
                        '--swatch-color': color
                      } as React.CSSProperties}
                      onClick={() => setSelectedBgColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                <div 
                  className="custom-color-input"
                  style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                >
                  <label style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}>Custom Color:</label>
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => {
                      setCustomBgColor(e.target.value);
                      setSelectedBgColor(e.target.value);
                    }}
                    style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                  />
                  <span className="color-value">{selectedBgColor}</span>
                </div>
              </div>
            </div>

            <div className="color-section">
              <h3>Shelf Border Color (Sides)</h3>
              <div className="color-picker-section">
                <div className="preset-colors">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-swatch ${selectedFgColor === color ? 'selected' : ''}`}
                      style={{ 
                        backgroundColor: color,
                        '--swatch-color': color
                      } as React.CSSProperties}
                      onClick={() => setSelectedFgColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                <div 
                  className="custom-color-input"
                  style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                >
                  <label style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}>Custom Color:</label>
                  <input
                    type="color"
                    value={customFgColor}
                    onChange={(e) => {
                      setCustomFgColor(e.target.value);
                      setSelectedFgColor(e.target.value);
                    }}
                    style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                  />
                  <span className="color-value">{selectedFgColor}</span>
                </div>
              </div>
            </div>

            <div className="color-section">
              <h3>Book Colors (Select up to 6)</h3>
              <p className="color-hint">Choose colors that will be applied to your books in rotation</p>
              <div className="color-picker-section">
                <div className="preset-colors">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-swatch ${selectedBookColors.includes(color) ? 'selected-multi' : ''}`}
                      style={{ 
                        backgroundColor: color,
                        '--swatch-color': color
                      } as React.CSSProperties}
                      onClick={() => toggleBookColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                {selectedBookColors.length > 0 && (
                  <div className="selected-colors-display">
                    <label>Selected Book Colors ({selectedBookColors.length}/6):</label>
                    <div className="selected-colors-list">
                      {selectedBookColors.map((color, index) => (
                        <div key={color} className="selected-color-item">
                          <span className="color-order">{index + 1}</span>
                          <div className="selected-color-swatch" style={{ backgroundColor: color }} />
                          <span className="selected-color-code">{color}</span>
                          <button 
                            className="remove-color-btn"
                            onClick={() => toggleBookColor(color)}
                            title="Remove"
                            style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="color-section">
              <h3>Book Spine Font</h3>
              <p className="color-hint">Choose the font style for book spine text</p>
              <div className="font-picker-section">
                <select 
                  className="font-selector"
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  style={{ 
                  fontFamily: selectedFont,
                  '--select-font-family': selectedFont
                } as React.CSSProperties}
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option 
                      key={font.value} 
                      value={font.value}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </option>
                  ))}
                </select>
                <div 
                  className="font-preview" 
                  style={{ 
                    fontFamily: selectedFont,
                    '--preview-font-family': selectedFont
                  } as React.CSSProperties}
                >
                  <p>Preview: The Quick Brown Fox</p>
                  <p style={{ fontSize: '0.9em' }}>Sample Book Title by Author Name</p>
                </div>
              </div>
            </div>

            <div className="preview-section">
              <h3>Preview</h3>
              <div className="shelf-preview">
                <div 
                  className="preview-shelf"
                  style={{ 
                    backgroundColor: selectedBgColor,
                    border: `8px solid ${selectedFgColor}`
                  }}
                >
                  <div className="preview-books">
                    {selectedBookColors.length > 0 ? (
                      selectedBookColors.slice(0, 6).map((color, index) => (
                        <div key={index} className="preview-book" style={{ backgroundColor: color }}></div>
                      ))
                    ) : (
                      <>
                        <div className="preview-book" style={{ backgroundColor: '#C8B6A6' }}></div>
                        <div className="preview-book" style={{ backgroundColor: '#A8B8C8' }}></div>
                        <div className="preview-book" style={{ backgroundColor: '#C89B9B' }}></div>
                        <div className="preview-book" style={{ backgroundColor: selectedFgColor, height: '80px' }}></div>
                        <div className="preview-book" style={{ backgroundColor: '#A8B8A0' }}></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="theme-actions">
              <button className="apply-button" onClick={handleApplyColors}>
                Apply Colors to Shelf
              </button>
              <div className="save-theme-section">
                <input
                  type="text"
                  placeholder="Theme name..."
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  className="theme-name-input"
                />
                <button className="save-button" onClick={handleSaveAsTheme}>
                  Save as Theme
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookColors' && (
          <div className="theme-content">
            <h3>Apply Color Scheme to All Books</h3>
            <p className="tab-description">Choose a color scheme to apply to all books on your shelf</p>
            
            <div className="bulk-color-schemes">
              <div className="color-scheme-item">
                <h4>Pastel Dreams</h4>
                <div className="scheme-preview">
                  {['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('pastels')}
                >
                  Apply Pastels
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Vibrant & Bold</h4>
                <div className="scheme-preview">
                  {['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('vibrant')}
                >
                  Apply Vibrant
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Ocean Blues</h4>
                <div className="scheme-preview">
                  {['#A8DADC', '#457B9D', '#1D3557', '#F1FAEE', '#E63946', '#2A9D8F'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('blues')}
                >
                  Apply Blues
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Warm Reds</h4>
                <div className="scheme-preview">
                  {['#C1666B', '#D4A5A5', '#9A031E', '#FFB3B3', '#D6536D', '#EFB0A1'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('reds')}
                >
                  Apply Reds
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Earth Tones</h4>
                <div className="scheme-preview">
                  {['#8B7355', '#A0826D', '#C9B8A8', '#E8DCC4', '#B8A898', '#D4C5B9'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('earth')}
                >
                  Apply Earth Tones
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Purple Haze</h4>
                <div className="scheme-preview">
                  {['#B794F4', '#9F7AEA', '#805AD5', '#6B46C1', '#D6BCFA', '#E9D8FD'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('purples')}
                >
                  Apply Purples
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Forest Greens</h4>
                <div className="scheme-preview">
                  {['#2F4F4F', '#556B2F', '#6B8E23', '#8FBC8F', '#90EE90', '#98FB98'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('greens')}
                >
                  Apply Greens
                </button>
              </div>

              <div className="color-scheme-item">
                <h4>Monochrome</h4>
                <div className="scheme-preview">
                  {['#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D'].map(c => (
                    <div key={c} className="scheme-swatch" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button 
                  className="apply-scheme-button"
                  onClick={() => onApplyBulkBookColors('monochrome')}
                >
                  Apply Monochrome
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="theme-content">
            <h3>Choose Book Spine Font</h3>
            <p className="tab-description">Select a font style for your book spines</p>
            
            <div className="font-picker-section">
              <select 
                className="font-selector-large"
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                style={{ 
                  fontFamily: selectedFont,
                  '--select-font-family': selectedFont
                } as React.CSSProperties}
              >
                {AVAILABLE_FONTS.map(font => (
                  <option 
                    key={font.value} 
                    value={font.value}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </option>
                ))}
              </select>
              <div 
                className="font-preview-large" 
                style={{ 
                  fontFamily: selectedFont,
                  '--preview-font-family': selectedFont
                } as React.CSSProperties}
              >
                <h3>Preview</h3>
                <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>The Quick Brown Fox Jumps Over The Lazy Dog</p>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Sample Book Title</p>
                <p style={{ fontSize: '1.8rem', color: '#666' }}>by Author Name</p>
              </div>
            </div>

            <div className="theme-actions">
              <button className="apply-button" onClick={handleApplyColors}>
                Apply Font to Shelf
              </button>
            </div>
          </div>
        )}

        {activeTab === 'premade' && (
          <div className="theme-content">
            <h3>Pre-Made Complete Themes</h3>
            <p className="tab-description">These themes include shelf colors and matching book color schemes</p>
            
            <div className="saved-themes-list">
              {PREMADE_THEMES.map(theme => (
                <div key={theme.id} className="theme-item premade-theme-item">
                  <div className="theme-info">
                    <h4>{theme.name}</h4>
                    <div className="theme-details">
                      <div className="shelf-colors-row">
                        <label>Shelf Colors:</label>
                        <div className="theme-color-preview">
                          <span 
                            className="theme-color-swatch"
                            style={{ backgroundColor: theme.shelfBgColor }}
                            title={`Background: ${theme.shelfBgColor}`}
                          ></span>
                          <span 
                            className="theme-color-swatch"
                            style={{ backgroundColor: theme.shelfFgColor }}
                            title={`Border: ${theme.shelfFgColor}`}
                          ></span>
                        </div>
                      </div>
                      {theme.bookColorPalette && theme.bookColorPalette.length > 0 && (
                        <div className="book-colors-row">
                          <label>Book Colors:</label>
                          <div className="book-palette-preview">
                            {theme.bookColorPalette.map((color, index) => (
                              <span
                                key={index}
                                className="book-palette-swatch"
                                style={{ backgroundColor: color }}
                                title={color}
                              ></span>
                            ))}
                          </div>
                        </div>
                      )}
                      {theme.spineFont && (
                        <div className="font-info-row">
                          <label>Spine Font:</label>
                          <span 
                            className="font-name" 
                            style={{ 
                              fontFamily: theme.spineFont,
                              '--font-name-family': theme.spineFont
                            } as React.CSSProperties}
                          >
                            {AVAILABLE_FONTS.find(f => f.value === theme.spineFont)?.name || theme.spineFont}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="theme-actions-buttons">
                    <button 
                      className="apply-theme-button"
                      onClick={() => handleApplyTheme(theme)}
                    >
                      Apply Theme
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="theme-content">
            <h3>My Saved Themes</h3>
            <p className="tab-description">Your custom saved themes</p>
            
            <div className="saved-themes-list">
              {savedThemes.length === 0 ? (
                <p className="no-themes">No saved themes yet. Customize colors and save your first theme!</p>
              ) : (
                savedThemes.map(theme => (
                  <div key={theme.id} className="theme-item">
                    <div className="theme-info">
                      <h4>{theme.name}</h4>
                      <div className="theme-details">
                        <div className="shelf-colors-row">
                          <label>Shelf Colors:</label>
                          <div className="theme-color-preview">
                            <span 
                              className="theme-color-swatch"
                              style={{ backgroundColor: theme.shelfBgColor }}
                              title={`Background: ${theme.shelfBgColor}`}
                            ></span>
                            <span 
                              className="theme-color-swatch"
                              style={{ backgroundColor: theme.shelfFgColor }}
                              title={`Border: ${theme.shelfFgColor}`}
                            ></span>
                          </div>
                        </div>
                        {theme.bookColorPalette && theme.bookColorPalette.length > 0 && (
                          <div className="book-colors-row">
                            <label>Book Colors:</label>
                            <div className="book-palette-preview">
                              {theme.bookColorPalette.map((color, index) => (
                                <span
                                  key={index}
                                  className="book-palette-swatch"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                ></span>
                              ))}
                            </div>
                          </div>
                        )}
                        {!theme.bookColorPalette && theme.bookColors.length > 0 && (
                          <div className="book-colors-row">
                            <span className="book-colors-count">
                              {theme.bookColors.length} custom book color{theme.bookColors.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {theme.spineFont && (
                          <div className="font-info-row">
                            <label>Spine Font:</label>
                            <span 
                              className="font-name" 
                              style={{ 
                                fontFamily: theme.spineFont,
                                '--font-name-family': theme.spineFont
                              } as React.CSSProperties}
                            >
                              {AVAILABLE_FONTS.find(f => f.value === theme.spineFont)?.name || theme.spineFont}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="theme-actions-buttons">
                      <button 
                        className="apply-theme-button"
                        onClick={() => handleApplyTheme(theme)}
                      >
                        Apply
                      </button>
                      {!theme.isDefault && (
                        <button 
                          className="delete-theme-button"
                          onClick={() => {
                            if (window.confirm(`Delete theme "${theme.name}"?`)) {
                              onDeleteTheme(theme.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

