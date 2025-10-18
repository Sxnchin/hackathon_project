import React, { useState } from 'react';
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";

const LoggedInCard = () => {
    const user = JSON.parse(localStorage.getItem('liquidSplitUser'));
    return (
        <motion.div
            className="get-started-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
            <h2 className="text-3xl font-bold text-gray-800 text-center">Login Successful!</h2>
            <p className="text-gray-500 text-center mt-2">
                Welcome back, <span className="font-bold">{user ? user.name : 'User'}</span>!
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
                <Link to="/demo" className="cta-btn w-full text-center" style={{ textDecoration: 'none' }}>
                    Proceed to Demo
                </Link>
            </div>
        </motion.div>
    );
};

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [ifLoggedIn, setIfLoggedIn] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            // 1. Send the user's input to your backend API.
            const response = await fetch('http://localhost:4000/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            // 2. Check if the backend responded with an error (e.g., user not found).
            // Your backend determines if the login is valid by checking the database.
            if (!response.ok) {
                // If the backend says the login failed, throw an error to be displayed.
                throw new Error(data.error || 'Failed to log in.');
            }
            
            // 3. If the response was successful, store the data.
            localStorage.setItem('liquidSplitToken', data.token);
            localStorage.setItem('liquidSplitUser', JSON.stringify(data.user));
            
            // 4. Update the UI to show the success card.
            setIfLoggedIn(true);

        } catch (err) {
            // 5. If any error was thrown (e.g., from a failed login), display it.
            setError(err.message);
        }
    };

    return (
        <div className="get-started-page-container">
            {ifLoggedIn ? (
                <LoggedInCard />
            ) : (
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
            )}
        </div>
    );
}

export default Login;
