import React from "react";
import ConnectBankButton from "./ConnectBankButton";

function UserProfile() {
  // Assuming you’re storing the logged-in user in localStorage after login
  const user = JSON.parse(localStorage.getItem("liquidSplitUser"));

  if (!user) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="profile-container">
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>

      {/* 👇 This is where you drop in the Plaid integration */}
      <ConnectBankButton userId={user.id} />
    </div>
  );
}

export default UserProfile;