import { useState, useEffect } from 'react';

// This is a helper component for SVG icons to keep the main component cleaner.
const Icon = ({ type }) => {
    const icons = {
        cart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
        users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
        receipt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icons[type]}
        </svg>
    );
};

function App() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSplitComplete, setIsSplitComplete] = useState(false);

    const friends = [
        { name: 'You', share: 100.00 },
        { name: 'Alex', share: 100.00 },
        { name: 'Jordan', share: 100.00 }
    ];

    // This useEffect hook injects the necessary CSS keyframes for animations into the document's head.
    // This is a clean way to handle component-specific global styles in a single-file setup.
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            body {
                font-family: 'Inter', sans-serif;
            }
            .gradient-bg {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            .card-shadow {
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.5s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
        
        // Cleanup function to remove the style when the component unmounts
        return () => {
            document.head.removeChild(style);
        };
    }, []);


    const handleSplit = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setIsSplitComplete(true);
        }, 1500);
    };

    const getButtonClass = () => {
        if (isSplitComplete) {
            return 'bg-green-600';
        }
        if (isProcessing) {
            return 'bg-blue-600 opacity-50 cursor-not-allowed';
        }
        return 'bg-blue-600 hover:bg-blue-700';
    };

    return (
        <div className="bg-gray-50 text-gray-800">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">LiquidSplit</h1>
                    <div>
                        <a href="#demo" className="text-gray-600 hover:text-blue-600 font-medium">Demo</a>
                        <a href="#features" className="ml-6 text-gray-600 hover:text-blue-600 font-medium">Features</a>
                        <a href="#" className="ml-6 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Get Started</a>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="gradient-bg">
                <section className="container mx-auto px-6 py-24 text-center">
                    <h2 className="text-5xl font-extrabold text-gray-900 leading-tight">Split purchases, not friendships.</h2>
                    <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">Real-time fractional ownership of any bill or purchase. One transaction, multiple owners, zero hassle.</p>
                    <div className="mt-8">
                        <a href="#demo" className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105">See the MVP in Action</a>
                    </div>
                </section>
            </main>

            {/* How It Works */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-100 text-blue-600 rounded-full h-20 w-20 flex items-center justify-center mb-4">
                                <Icon type="cart" />
                            </div>
                            <h4 className="text-xl font-semibold mb-2">1. Shop & Checkout</h4>
                            <p className="text-gray-600">At any online checkout, select "Pay with LiquidSplit".</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-100 text-blue-600 rounded-full h-20 w-20 flex items-center justify-center mb-4">
                                <Icon type="users" />
                            </div>
                            <h4 className="text-xl font-semibold mb-2">2. Invite Friends & Split</h4>
                            <p className="text-gray-600">Instantly invite friends to claim their share. Each pays their portion securely via Stripe.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-100 text-blue-600 rounded-full h-20 w-20 flex items-center justify-center mb-4">
                                <Icon type="receipt" />
                            </div>
                            <h4 className="text-xl font-semibold mb-2">3. Get Digital Receipts</h4>
                            <p className="text-gray-600">Everyone receives a fractional digital receipt (NFT) showing their exact ownership percentage.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Hackathon MVP Scope */}
            <section id="demo" className="py-20 bg-gray-100">
                <div className="container mx-auto px-6">
                    <div className="text-center">
                        <h3 className="text-3xl font-bold">Hackathon MVP Demo</h3>
                        <p className="mt-2 text-gray-600">Mock checkout flow: 3 friends "split" a $300 TV at the time of purchase.</p>
                    </div>

                    <div className="mt-12 max-w-4xl mx-auto bg-white rounded-xl card-shadow overflow-hidden md:flex">
                        {/* Product Info */}
                        <div className="md:w-1/2 p-8">
                            <h4 className="text-2xl font-bold mb-4">Checkout Summary</h4>
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center">
                                    <img src="https://placehold.co/100x100/e2e8f0/334155?text=4K+TV" alt="4K TV" className="rounded-lg mr-4" />
                                    <div>
                                        <p className="font-semibold">Smart 4K TV</p>
                                        <p className="text-sm text-gray-500">Electronics</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold">$300.00</p>
                            </div>
                            <hr className="my-6" />
                            <h5 className="font-semibold text-lg mb-4">Split Details</h5>
                            <div className="space-y-3 text-gray-700">
                                {isSplitComplete ? (
                                    friends.map((friend, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                                            <span>{friend.name}</span>
                                            <span className="font-bold text-green-600">${friend.share.toFixed(2)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p>No splitters yet. Click "Split Purchase" to begin.</p>
                                )}
                            </div>
                        </div>
                        {/* Splitting Action */}
                        <div className="md:w-1/2 p-8 bg-gray-50 flex flex-col justify-center">
                            <h4 className="text-2xl font-bold text-center mb-6">Split this Purchase</h4>
                            <button
                                onClick={handleSplit}
                                disabled={isProcessing || isSplitComplete}
                                className={`w-full text-white font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105 ${getButtonClass()}`}
                            >
                                {isSplitComplete ? 'Split Successfully!' : isProcessing ? 'Processing Split...' : 'Split with 2 Friends'}
                            </button>
                            <div className={`mt-8 grid grid-cols-1 gap-4 transition-opacity duration-700 ${isSplitComplete ? 'opacity-100' : 'opacity-0'}`}>
                                {isSplitComplete && friends.map((friend, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 animate-fade-in">
                                        <h6 className="font-semibold">{friend.name}'s Digital Receipt</h6>
                                        <p className="text-sm text-gray-500">Ownership: 33.33%</p>
                                        <p className="text-sm text-gray-500">Value: ${friend.share.toFixed(2)}</p>
                                        <p className="text-xs text-blue-500 mt-2">NFT Minted: #0xA3...F2B</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Differentiation/Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="text-3xl font-bold mb-4">Why We're Different</h3>
                            <p className="text-gray-600 mb-6">Most apps handle splitting after one person has already paid. LiquidSplit makes multi-party, real-time ownership possible at the point of sale. No more chasing friends for money.</p>
                            <ul className="space-y-4">
                                <li className="flex items-start">
                                    <svg className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><Icon type="check"/></svg>
                                    <span><span className="font-semibold">Instant Splitting:</span> Co-own an item from the moment you buy it.</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><Icon type="check"/></svg>
                                    <span><span className="font-semibold">Single Transaction:</span> One Stripe transaction powers the entire multi-party payment.</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><Icon type="check"/></svg>
                                    <span><span className="font-semibold">Verifiable Ownership:</span> Digital NFT receipts provide a clear record of who owns what percentage.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="text-center">
                            <img src="https://placehold.co/400x300/c3cfe2/1e293b?text=Tech+Powered" className="rounded-lg shadow-lg mx-auto" alt="Technology" />
                            <p className="mt-4 text-sm text-gray-500">Powered by Stripe Connect & modern payment APIs.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-800 text-white">
                <div className="container mx-auto px-6 py-8 text-center">
                    <p>&copy; 2025 LiquidSplit. A hackathon project concept.</p>
                </div>
            </footer>
        </div>
    );
}

export default App;