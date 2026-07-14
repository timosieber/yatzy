import Dialog from './Dialog.jsx'

export default function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose }) {
  return <Dialog title={title} description={description} onClose={onClose} className="confirm-dialog">
    <div className="dialog-actions horizontal">
      <button type="button" className="secondary-button" onClick={onClose}>Abbrechen</button>
      <button type="button" className="danger-button" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Dialog>
}
