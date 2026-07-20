import React from "react";

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-slate-950/40 flex justify-center items-center z-[1000] backdrop-blur-[4px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl py-8 px-8 shadow-2xl border border-slate-100 flex flex-col items-stretch min-w-[360px] max-w-[420px] w-[90%] relative animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center w-8 h-8 border border-slate-100 cursor-pointer text-xl leading-none"
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
