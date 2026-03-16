/**
 * Reusable confirm dialog component.
 * Shows a modal overlay with a message and Confirm/Cancel buttons.
 * Used for actions like deleting items that need user confirmation.
 */

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="dialog-overlay" data-testid="confirm-dialog">
      <div className="dialog-box" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            data-testid="dialog-cancel"
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            data-testid="dialog-confirm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
