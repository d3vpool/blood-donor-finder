import React from "react";

export default function Response() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-8 text-gray-800">Your Response</h2>
        <div className="flex flex-col gap-4">
          <button className="py-3 px-6 bg-green-500 text-white font-bold rounded-lg border-none cursor-pointer hover:bg-green-600 transition-colors text-lg">
            ACCEPT
          </button>
          <button className="py-3 px-6 bg-[#e74c3c] text-white font-bold rounded-lg border-none cursor-pointer hover:bg-[#c0392b] transition-colors text-lg">
            REJECT
          </button>
        </div>
      </div>
    </div>
  );
}
