import React, { useState, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";

function ConnectBankButton({ userId }) {
  const [linkToken, setLinkToken] = useState(null);

  // Create a link token from backend
  useEffect(() => {
    async function createLinkToken() {
      const res = await fetch("http://localhost:4000/plaid/create_link_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setLinkToken(data.link_token);
    }
    createLinkToken();
  }, [userId]);

  const onSuccess = async (public_token) => {
    await fetch("http://localhost:4000/plaid/exchange_public_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token }),
    });
    alert("✅ Bank account successfully connected!");
  };

  const config = {
    token: linkToken,
    onSuccess,
    onExit: (err, metadata) => console.log("Plaid exit:", err, metadata),
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <button className="connect-bank-btn" onClick={() => open()} disabled={!ready}>
      Connect Bank Account
    </button>
  );
}

export default ConnectBankButton;