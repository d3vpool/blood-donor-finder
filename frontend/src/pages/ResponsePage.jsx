import React from "react";
import "./Response.css";

export default function Response() {
  return (
    <div className="response-container">
      <div className="response-box">
        <h2>Your Response</h2>

        <button className="btn accept-btn">ACCEPT</button>
        <button className="btn reject-btn">REJECT</button>
      </div>
    </div>
  );
}
