import React, { useState } from "react";

function GetStarted() {
  // Define state variables for form fields
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault(); 
    console.log("Form submitted:", { email, username, password });

    // You could later connect this to a backend or API
    alert(`Welcome ${username || "User"}! Your account setup has started.`);
  };

  return (
    <section id="get-started" className="get-started-section">
      <h2>Get Started with LiquidSplit</h2>
      <p>Ready to simplify your shared purchases? Getting started with LiquidSplit is easy!</p>

      <form onSubmit={handleSubmit}>
        {/* Username */}
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          name="username"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {/* Email */}
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Password */}
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Get Started</button>
      </form>
    </section>
  );
}

export default GetStarted;
