import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardSuccess() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/'), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="onboard-success">
      <div className="notification">
        <h2>✅ Stripe Onboarding Complete</h2>
        <p style={{ marginTop: '0.25rem' }}>Your Stripe account has been created and linked. Redirecting to home…</p>
      </div>
    </div>
  );
}
