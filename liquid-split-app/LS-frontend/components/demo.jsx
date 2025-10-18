// src/components/Demo.jsx
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { io } from "socket.io-client";

// --- ICONS (no changes) ---
const CheckIcon = () => (<svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>);
const SpinnerIcon = () => (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

// --- SOCKET.IO CLIENT SETUP ---
const socket = io("http://localhost:4000");

function Demo({ closeDemo }) {
    const [splitState, setSplitState] = useState(null);
    const [receipts, setReceipts] = useState([]);
    const [isSplitting, setIsSplitting] = useState(false);

    useEffect(() => {
        // Listen for updates from the server
        const handleUpdate = (newState) => setSplitState(newState);
        const handleComplete = (data) => setReceipts(data.receipts);

        socket.on('update-split-status', handleUpdate);
        socket.on('split-complete', handleComplete);

        // Clean up listeners on component unmount
        return () => {
            socket.off('update-split-status', handleUpdate);
            socket.off('split-complete', handleComplete);
        };
    }, []);

    const handleStartSplit = () => {
        setIsSplitting(true);
        setReceipts([]);
        setSplitState(null); // Clear previous state
        socket.emit('start-split'); // Emit event to the server
    };

    const handlePay = (userId) => {
        const user = splitState?.participants.find(p => p.id === userId);
        if (user && user.status === 'pending') {
            // Optimistic UI update for better UX
            const newParticipants = splitState.participants.map(p => p.id === userId ? { ...p, status: 'paying' } : p);
            setSplitState({ ...splitState, participants: newParticipants });
            
            // Simulate a delay and then emit to server
            setTimeout(() => {
                socket.emit('user-paid', { userId });
            }, 1500);
        }
    };

    return (
        <div className="demo-modal-backdrop">
            <motion.div className="demo-modal-content" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <button onClick={closeDemo} className="close-demo-btn">&times;</button>
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-gray-800 text-center">LiquidSplit Demo</h2>
                    <p className="text-gray-500 text-center mt-2">Mock Checkout: Real-time splitting of a $300 TV purchase.</p>
                </div>
                <div className="md:flex">
                    <div className="w-full md:w-1/2 p-8 border-r border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold">Smart 4K TV</h3>
                            <p className="text-2xl font-bold text-gray-800">$300.00</p>
                        </div>
                        <hr />
                        <h4 className="text-lg font-semibold mt-6 mb-4">Participants</h4>
                        <div className="space-y-4">
                            {!isSplitting && <div className="text-center p-4 bg-gray-50 rounded-lg"><p className="text-gray-600">Click "Start Split" to begin.</p></div>}
                            {splitState?.participants.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium text-gray-700">{user.name}</span>
                                    <span className="text-gray-600">${user.share.toFixed(2)}</span>
                                    {user.status === 'pending' && <button onClick={() => handlePay(user.id)} className="pay-btn">Pay</button>}
                                    {user.status === 'paying' && <button disabled className="processing-btn"><SpinnerIcon /> Processing...</button>}
                                    {user.status === 'paid' && <CheckIcon />}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 p-8 bg-gray-50 flex flex-col items-center justify-center min-h-[300px]">
                        {!isSplitting && <button onClick={handleStartSplit} className="start-split-btn">Start Split Purchase</button>}
                        {isSplitting && receipts.length === 0 && (
                            <div className="text-center">
                                <h3 className="text-xl font-semibold text-gray-700">Awaiting Payments...</h3>
                                <p className="text-gray-500 mt-2">Click "Pay" for each user to simulate.</p>
                            </div>
                        )}
                        {receipts.length > 0 && (
                            <div className="w-full">
                                <h3 className="text-xl font-semibold text-green-600 text-center mb-4">Split Complete!</h3>
                                <div className="space-y-3">
                                    {receipts.map((receipt, index) => (
                                        <div key={index} className="receipt-card" style={{ animationDelay: `${index * 150}ms` }}>
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
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default Demo;