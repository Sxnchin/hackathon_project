import React, { useState } from 'react';
import { motion } from "framer-motion";

function GetStarted({ closeForm }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Welcome ${username}! Your account setup has started.`);
        closeForm();
    };

    return (
        <div className="demo-modal-backdrop">
            <motion.div 
                className="demo-modal-content get-started-modal" 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <button onClick={closeForm} className="close-demo-btn">&times;</button>
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-gray-800 text-center">Get Started</h2>
                    <p className="text-gray-500 text-center mt-2">Ready to simplify your shared purchases?</p>
                    <form onSubmit={handleSubmit} className="get-started-form">
                        <label htmlFor="username">Username:</label>
                        <input type="text" id="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        <label htmlFor="email">Email:</label>
                        <input type="email" id="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <label htmlFor="password">Password:</label>
                        <input type="password" id="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button type="submit" className="cta-btn">Create Account</button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

export default GetStarted;