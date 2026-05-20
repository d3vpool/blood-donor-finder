function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black/20 flex justify-center items-center z-[1000] backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-200 to-blue-100 rounded-[22px] py-9 px-8 pb-6 shadow-[0_8px_40px_rgba(44,62,80,0.17)] flex flex-col items-center min-w-[380px] max-w-[420px] w-[90%] relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-[18px] right-6 text-black cursor-pointer bg-transparent border-none text-2xl transition-all hover:text-white hover:bg-red-600 rounded px-1"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;
