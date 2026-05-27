import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    // Listen to native dialog close (e.g. from ESC key press)
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  // Click outside to close (light dismiss)
  const handleBackdropClick = (e) => {
    const dialog = dialogRef.current;
    if (e.target === dialog) {
      onClose();
    }
  };

  return (
    <dialog ref={dialogRef} onClick={handleBackdropClick}>
      <div className="dialog-header">
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button 
          className="btn btn-secondary btn-icon-only btn-sm" 
          onClick={onClose} 
          aria-label="Close dialog"
          style={{ padding: '4px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center' }}
        >
          <X size={16} />
        </button>
      </div>
      <div className="dialog-body">
        {children}
      </div>
    </dialog>
  );
}
