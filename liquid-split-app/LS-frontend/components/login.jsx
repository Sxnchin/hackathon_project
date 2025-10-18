import React, { useState } from 'react';
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const response = await fetch('http://localhost:4000/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to log in.');
            }
            
            // Store the token and user info for other components to use
            localStorage.setItem('liquidSplitToken', data.token);
            localStorage.setItem('liquidSplitUser', JSON.stringify(data.user));

            navigate('/demo'); // Redirect to the demo page after login

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="get-started-page-container">
            <motion.div 
                className="get-started-card"
                initial={{ opacity: 0, y: -30 }} 
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-3xl font-bold text-gray-800 text-center">Welcome Back</h2>
                <p className="text-gray-500 text-center mt-2">Log in to continue to LiquidSplit.</p>
                
                <form onSubmit={handleSubmit} className="get-started-form">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    
                    <button type="submit" className="cta-btn">Log In</button>
                </form>
                
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                
                <p className="text-center mt-4 text-gray-600">
                    Don't have an account? <Link to="/get-started" className="text-indigo-600 hover:underline">Sign Up</Link>
                </p>
            </motion.div>
        </div>
    );
}

export default Login;
