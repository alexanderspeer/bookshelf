import React from 'react';
import '../styles/welcome-modal.css';

interface WelcomeModalProps {
  isOpen: boolean;
  onImportClick: () => void;
  onSkipClick: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onImportClick, onSkipClick }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onSkipClick}>
      <div 
        className="modal-content rpgui-container framed-golden welcome-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', width: 'auto', minWidth: '500px' }}
      >
        <div className="modal-header">
          <h2>Welcome to Your Bookshelf!</h2>
        </div>
        
        <div className="modal-body">
          <p className="welcome-intro">
            If you have an existing Goodreads account, you can quickly import your book collection!
          </p>

          <div className="import-instructions">
            <h3>How to Import from Goodreads:</h3>
            <ol>
              <li>Go to <strong>Goodreads</strong> and log in to your account</li>
              <li>Click <strong>My Books</strong> in the top navigation bar</li>
              <li>On the left side of the page, scroll to the <strong>Tools</strong> section</li>
              <li>Under Tools, click <strong>Import and Export</strong></li>
              <li>At the top of the page, select <strong>Export Library</strong></li>
              <li>Download the generated CSV file when it is ready</li>
              <li>Upload the CSV file here using the import button below</li>
            </ol>
            
            <div className="import-note">
              <strong>Note:</strong> Only books from your "Read" shelf will be imported. 
              Star ratings and reading dates will be preserved.
            </div>
          </div>

          <div className="welcome-actions">
            <button
              className="rpgui-button"
              onClick={onImportClick}
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <p>Import from Goodreads</p>
            </button>
            <button
              className="rpgui-button"
              onClick={onSkipClick}
              style={{ cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer" }}
            >
              <p>Skip - I'll Add Books Manually</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

