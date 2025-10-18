import React, { useState, useEffect } from 'react';

// --- MOCK SOCKET.IO SERVER ---
// This simulates a real-time server to demonstrate the functionality
// without needing a separate backend for the hackathon demo. It's
// placed outside the component to act like a persistent module.
const mockSocketServer = {
    listeners: {},
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    emit(event, data) {
        console.log(`[CLIENT EMITS] -> ${event}`, data);
        switch (event) {
            case 'start-split':
                this.handleStartSplit();
                break;
            case 'user-paid':
                this.handleUserPaid(data.userId);
                break;
        }
    },
    broadcast(event, data) {
        console.log(`[SERVER BROADCASTS] -> ${event}`, data);
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    },
    state: {
        totalAmount: 300,
        participants: []
    },
    handleStartSplit() {
        this.state.participants = [
            { id: 1, name: 'You', share: 100, status: 'pending' },
            { id: 2, name: 'Alex', share: 100, status: 'pending' },
            { id: 3, name: 'Jordan', share: 100, status: 'pending' },
        ];
        this.broadcast('update-split-status', this.state);
    },
    handleUserPaid(userId) {
        const user = this.state.participants.find(p => p.id === userId);
        if (user && user.status === 'pending') {
            user.status = 'paid';
            this.broadcast('update-split-status', this.state);
            const allPaid = this.state.participants.every(p => p.status === 'paid');
            if (allPaid) {
                setTimeout(() => {
                    const receipts = this.state.participants.map(p => ({
                        owner: p.name,
                        value: p.share,
                        ownership: "33.33%",
                        nftId: `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
                    }));
                    this.broadcast('split-complete', { receipts });
                }, 1000);
            }
        }
    }
};

// --- SVG Icons ---
const CheckIcon = () => (
    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- React Component ---
function Demo() {
    const [splitState, setSplitState] = useState(null);
    const [receipts, setReceipts] = useState([]);
    const [isSplitting, setIsSplitting] = useState(false);

    useEffect(() => {
        // Define cleanup function
        const cleanup = () => {
            // In a real app, you would disconnect the socket here.
            // For our mock server, we'll just clear the listeners.
            mockSocketServer.listeners = {};
        };

        mockSocketServer.on('update-split-status', (newState) => {
            setSplitState(newState);
        });

        mockSocketServer.on('split-complete', (data) => {
            setReceipts(data.receipts);
        });
        
        // Return cleanup function
        return cleanup;
    }, []);
    
    const handleStartSplit = () => {
        setIsSplitting(true);
        mockSocketServer.emit('start-split');
    };

    const handlePay = (userId) => {
        const user = splitState.participants.find(p => p.id === userId);
        if (user && user.status === 'pending') {
            user.status = 'paying';
            setSplitState({...splitState});
            setTimeout(() => {
                 mockSocketServer.emit('user-paid', { userId });
            }, 1500);
        }
    };

    return (
        <>
            {/* You can move these styles to your main CSS file (e.g., index.css) */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
            `}</style>
            <div className="w-full max-w-4xl mx-auto p-4 md:p-8 font-sans">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        <h2 className="text-3xl font-bold text-gray-800 text-center">LiquidSplit Demo</h2>
                        <p className="text-gray-500 text-center mt-2">Mock Checkout: Real-time splitting of a $300 TV purchase.</p>
                    </div>

                    <div className="md:flex">
                        {/* Left Side */}
                        <div className="w-full md:w-1/2 p-8 border-r border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                                 <h3 className="text-xl font-semibold">Smart 4K TV</h3>
                                 <p className="text-2xl font-bold text-gray-800">$300.00</p>
                            </div>
                            <hr/>
                            <h4 className="text-lg font-semibold mt-6 mb-4">Participants</h4>
                            <div className="space-y-4">
                                {!isSplitting && (
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-gray-600">Click "Start Split" to begin the process.</p>
                                    </div>
                                )}
                                {splitState?.participants.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="font-medium text-gray-700">{user.name}</span>
                                        <span className="text-gray-600">${user.share.toFixed(2)}</span>
                                        {user.status === 'pending' && (
                                            <button onClick={() => handlePay(user.id)} className="bg-blue-600 text-white font-semibold py-1 px-4 rounded-lg hover:bg-blue-700 transition">
                                                Pay
                                            </button>
                                        )}
                                        {user.status === 'paying' && (
                                            <button disabled className="bg-blue-500 text-white font-semibold py-1 px-4 rounded-lg cursor-not-allowed flex items-center">
                                                <SpinnerIcon /> Processing...
                                            </button>
                                        )}
                                        {user.status === 'paid' && <CheckIcon />}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Right Side */}
                        <div className="w-full md:w-1/2 p-8 bg-gray-50 flex flex-col items-center justify-center min-h-[300px]">
                            {!isSplitting && (
                                 <button onClick={handleStartSplit} className="w-full max-w-xs bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-indigo-700 transition transform hover:scale-105">
                                    Start Split Purchase
                                </button>
                            )}

                            {isSplitting && receipts.length === 0 && (
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-gray-700">Awaiting Payments...</h3>
                                    <p className="text-gray-500 mt-2">Click "Pay" for each user to simulate the real-time process.</p>
                                </div>
                            )}
                            
                            {receipts.length > 0 && (
                                <div className="w-full">
                                    <h3 className="text-xl font-semibold text-green-600 text-center mb-4">Split Complete!</h3>
                                    <div className="space-y-3">
                                        {receipts.map((receipt, index) => (
                                            <div key={index} className="bg-white p-4 rounded-lg border border-green-200 shadow-sm fade-in" style={{animationDelay: `${index * 150}ms`}}>
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
                </div>
            </div>
        </>
    );
}

export default Demo;