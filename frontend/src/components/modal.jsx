import './modal.css';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Close button can be placed at the top right */}
        <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
        {children}
      </div>
    </div>
  );
}
export default Modal;
