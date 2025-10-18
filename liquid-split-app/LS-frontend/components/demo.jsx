import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// --- SVG Icons ---
const CheckIcon = () => ( <svg className="w-6 h-6" style={{color: 'var(--success-color)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> );
const SpinnerIcon = () => ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const SuccessIcon = () => (
    <motion.svg initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }} className="w-20 h-20 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </motion.svg>
);


// --- Mock Server (No changes here) ---
const mockSocketServer = {
    listeners: {},
    on(event, callback) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(callback); },
    emit(event, data) {
        switch (event) {
            case 'start-split': this.handleStartSplit(); break;
            case 'user-paid': this.handleUserPaid(data.userId); break;
        }
    },
    broadcast(event, data) { if (this.listeners[event]) { this.listeners[event].forEach(callback => callback(data)); } },
    state: { totalAmount: 300, participants: [] },
    handleStartSplit() {
        this.state.participants = [
            { id: 1, name: 'You', share: 100, status: 'pending' }, { id: 2, name: 'Alex', share: 100, status: 'pending' }, { id: 3, name: 'Jordan', share: 100, status: 'pending' },
        ];
        this.broadcast('update-split-status', this.state);
    },
    handleUserPaid(userId) {
        const user = this.state.participants.find(p => p.id === userId);
        if (user && user.status === 'pending') {
            user.status = 'paid';
            this.broadcast('update-split-status', { ...this.state });
            const allPaid = this.state.participants.every(p => p.status === 'paid');
            if (allPaid) {
                setTimeout(() => {
                    const receipts = this.state.participants.map(p => ({
                        owner: p.name, value: p.share, ownership: "33.33%",
                        nftId: `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
                    }));
                    this.broadcast('split-complete', { receipts });
                }, 1000);
            }
        }
    }
};

// --- React Component ---
function Demo() {
    const [splitState, setSplitState] = useState(null);
    const [receipts, setReceipts] = useState([]);
    const [isSplitting, setIsSplitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        mockSocketServer.on('update-split-status', (newState) => setSplitState(newState));
        mockSocketServer.on('split-complete', (data) => {
            setIsComplete(true);
            setTimeout(() => { setReceipts(data.receipts); }, 2000);
        });
        return () => { mockSocketServer.listeners = {}; };
    }, []);
    
    const handleStartSplit = () => { setIsSplitting(true); mockSocketServer.emit('start-split'); };

    // ✅ FIX: Rewrote this function for robust, immutable state updates.
    const handlePay = (userId) => {
        if (!splitState || !splitState.participants) return;
        const user = splitState.participants.find(p => p.id === userId);

        if (user && user.status === 'pending') {
            // Create a new array with the updated participant status.
            // This immutable approach ensures React detects the change and re-renders.
            const newParticipants = splitState.participants.map(p => 
                p.id === userId ? { ...p, status: 'paying' } : p
            );
            setSplitState({ ...splitState, participants: newParticipants });

            // Simulate network delay before confirming payment.
            setTimeout(() => {
                mockSocketServer.emit('user-paid', { userId });
            }, 1500);
        }
    };
    
    const paidCount = splitState?.participants.filter(p => p.status === 'paid').length || 0;
    const totalCount = splitState?.participants.length || 0;
    const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

    let actionContent;
    if (!isSplitting) {
        actionContent = <button onClick={handleStartSplit} className="start-split-btn-modern">Start Split Purchase</button>;
    } else if (isSplitting && !isComplete) {
        actionContent = (
            <div className="text-center w-full">
                <h3 className="text-xl font-semibold text-gray-700">Awaiting Payments...</h3>
                <p className="text-gray-500 mt-2">{paidCount} of {totalCount} participants have paid.</p>
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        );
    } else if (isComplete && receipts.length === 0) {
        actionContent = (
            <div className="text-center w-full">
                <SuccessIcon />
                <h3 className="text-2xl font-semibold text-green-600 mt-4">Payment Successful!</h3>
                <p className="text-gray-500 mt-2">Generating receipts...</p>
            </div>
        );
    } else if (receipts.length > 0) {
        actionContent = (
             <div className="w-full">
                <h3 className="text-2xl font-semibold text-green-600 text-center mb-4">Split Complete!</h3>
                <div className="space-y-3">
                    {receipts.map((receipt, index) => (
                        <div key={index} className="receipt-card-modern" style={{ animationDelay: `${index * 150}ms` }}>
                            <p className="font-bold text-gray-800">{receipt.owner}'s Digital Receipt</p>
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>Value: ${receipt.value.toFixed(2)}</span>
                                <span>Ownership: {receipt.ownership}</span>
                            </div>
                            <p className="text-xs text-indigo-500 mt-2 font-mono">NFT ID: {receipt.nftId}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="demo-page-container">
            <motion.div className="demo-card-modern" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <div className="demo-header">
                    <h2 className="text-3xl font-bold text-gray-800">LiquidSplit Demo</h2>
                    <p className="text-gray-500 mt-2">Mock Checkout: Real-time splitting of a $300 TV purchase.</p>
                </div>
                <div className="demo-content-grid">
                    <div className="checkout-panel">
                        <div className="item-row">
                            <h3 className="text-xl font-semibold">Smart 4K TV</h3>
                            <p className="text-2xl font-bold text-gray-800">$300.00</p>
                        </div>
                        <div className="participants-section">
                            <h4>Participants</h4>
                            <div className="space-y-3">
                                {splitState?.participants.map((user) => (
                                    <div key={user.id} className="participant-row-modern">
                                        <span className="font-medium text-gray-700">{user.name}</span>
                                        <span className="text-gray-600 font-semibold">${user.share.toFixed(2)}</span>
                                        {user.status === 'pending' && ( <button onClick={() => handlePay(user.id)} className="pay-btn-modern">Pay</button> )}
                                        {user.status === 'paying' && ( <button disabled className="pay-btn-modern processing flex items-center justify-center"><SpinnerIcon /></button> )}
                                        {user.status === 'paid' && <CheckIcon />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="action-panel-modern">
                        {actionContent}
                    </div>
                </div>
            </motion.div>
            <Link to="/" className="back-link-modern">&larr; Back to Home</Link>
        </div>
    );
}

export default Demo;
