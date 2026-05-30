import { useEffect, useRef } from 'react';

export default function ConfirmationModal({ confirmState, setConfirmState }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (confirmState.show) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [confirmState.show]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setConfirmState(prev => ({ ...prev, show: false }));
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [setConfirmState]);

  // Click outside to close (light dismiss)
  const handleBackdropClick = (e) => {
    const dialog = dialogRef.current;
    if (e.target === dialog) {
      setConfirmState(prev => ({ ...prev, show: false }));
    }
  };

  if (!confirmState.show) return null;

  return (
    <dialog 
      ref={dialogRef} 
      onClick={handleBackdropClick}
      style={{
        maxWidth: '420px',
        width: '90%',
        padding: '1.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        boxShadow: 'var(--shadow-lg), 0 0 0 100vw rgba(0, 0, 0, 0.5)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {confirmState.title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
          {confirmState.message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          {confirmState.showCancel !== false && (
            <button 
              className="btn btn-secondary" 
              onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
              style={{ padding: '0.5rem 1rem' }}
            >
              {confirmState.cancelText || 'Cancel'}
            </button>
          )}
          <button 
            className={`btn ${confirmState.isDanger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={() => {
              if (confirmState.onConfirm) {
                confirmState.onConfirm();
              }
              setConfirmState(prev => ({ ...prev, show: false }));
            }}
            style={{ padding: '0.5rem 1rem' }}
          >
            {confirmState.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
