import React from "react";
import './Card.css'; // Import the new CSS file

function Card(){
    return (
        <div className="card-container">
            {/* The anchor tag makes the entire card a clickable link */}
            <a href="#" className="debit-card">
                <div className="card-chip"></div>
                <div className="card-logo">LiquidSplit</div>
                <div className="card-number">
                    <span>4000</span>
                    <span>1234</span>
                    <span>5678</span>
                    <span>9010</span>
                </div>
                <div className="card-holder-info">
                    <span className="info-label">Card Holder</span>
                    <span>YOUR NAME HERE</span>
                </div>
                <div className="card-expiry-info">
                    <span className="info-label">Expires</span>
                    <span>12/28</span>
                </div>
            </a>
        </div>
    )
}

export default Card;