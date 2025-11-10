// nav.jsx
import React, { useState, useEffect } from "react";
import "./nav.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

function Nav() {
  const location = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  // State for the mobile menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("ALL");

  // Only show extra links on the home page (path is "/")
  const showExtraLinks = location.pathname === "/";

  // Fetch notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Poll for new notifications every 5 seconds for real-time updates
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:4000/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Silently fail on rate limit or server errors
        if (res.status === 429 || res.status >= 500) {
          console.warn(`Notification fetch failed with status ${res.status}, will retry...`);
          return;
        }
      }

      if (res.ok) {
        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          console.error("Failed to parse notifications JSON:", parseError);
          return;
        }
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      // Network errors - just log and continue
      console.error("Failed to fetch notifications (network error):", err.message);
    }
  };

  const handlePay = async (notificationId, potId, userId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      
      // Update payment status to PAID
      const res = await fetch(`http://localhost:4000/pots/${potId}/members/${userId}/payment-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "PAID" }),
      });

      if (res.ok) {
        // Delete notification
        await fetch(`http://localhost:4000/notifications/${notificationId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        // Refresh notifications
        await fetchNotifications();
        
        // Trigger event to refresh pot data across all windows
        window.dispatchEvent(new CustomEvent("pot:updated", { detail: { potId } }));
        
        alert("Payment confirmed!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to confirm payment");
      }
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      alert("Failed to confirm payment");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleDeny = async (notificationId, potId, userId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      
      // Update payment status to DENIED (removes from pot)
      const res = await fetch(`http://localhost:4000/pots/${potId}/members/${userId}/payment-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "DENIED" }),
      });

      if (res.ok) {
        // Delete notification
        await fetch(`http://localhost:4000/notifications/${notificationId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        // Refresh notifications
        await fetchNotifications();
        
        // Trigger event to refresh pot data across all windows
        window.dispatchEvent(new CustomEvent("pot:updated", { detail: { potId } }));
        
        alert("You have been removed from the pot");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to deny participation");
      }
    } catch (err) {
      console.error("Failed to deny participation:", err);
      alert("Failed to deny participation");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleAcceptFriendRequest = async (notificationId, friendRequestId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      
      // Accept friend request
      const res = await fetch(`http://localhost:4000/friends/accept/${friendRequestId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Refresh notifications (backend already deleted it)
        await fetchNotifications();
        
        // Trigger event to refresh friend list
        window.dispatchEvent(new Event("friends:refresh"));
        
        alert("Friend request accepted!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to accept friend request");
      }
    } catch (err) {
      console.error("Failed to accept friend request:", err);
      alert("Failed to accept friend request");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleDeclineFriendRequest = async (notificationId, friendRequestId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      
      // Decline friend request
      const res = await fetch(`http://localhost:4000/friends/decline/${friendRequestId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Refresh notifications (backend already deleted it)
        await fetchNotifications();
        
        // Trigger event to refresh friend list
        window.dispatchEvent(new Event("friends:refresh"));
        
        alert("Friend request declined");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to decline friend request");
      }
    } catch (err) {
      console.error("Failed to decline friend request:", err);
      alert("Failed to decline friend request");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleAcceptGroupInvitation = async (notificationId, groupInvitationId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      
      // Accept group invitation
      const res = await fetch(`http://localhost:4000/groups/invitations/${groupInvitationId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Refresh notifications (backend already deleted it)
        await fetchNotifications();
        
        // Trigger event to refresh groups/invitations
        window.dispatchEvent(new Event("groups:refresh"));
        
        alert("Group invitation accepted!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to accept group invitation");
      }
    } catch (err) {
      console.error("Failed to accept group invitation:", err);
      alert("Failed to accept group invitation");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleDeclineGroupInvitation = async (notificationId, groupInvitationId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      
      // Decline group invitation
      const res = await fetch(`http://localhost:4000/groups/invitations/${groupInvitationId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Refresh notifications (backend already deleted it)
        await fetchNotifications();
        
        // Trigger event to refresh groups/invitations
        window.dispatchEvent(new Event("groups:refresh"));
        
        alert("Group invitation declined");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to decline group invitation");
      }
    } catch (err) {
      console.error("Failed to decline group invitation:", err);
      alert("Failed to decline group invitation");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const unreadCount = notifications.filter(n => n.status === "UNREAD").length;

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter((notification) => {
    if (notificationFilter === "ALL") return true;
    if (notificationFilter === "FRIEND_REQUESTS") return notification.type === "FRIEND_REQUEST";
    if (notificationFilter === "GROUP_INVITATIONS") return notification.type === "GROUP_INVITATION";
    if (notificationFilter === "PAYMENTS") return notification.type === "PAYMENT_REQUEST" || notification.type === "PAYMENT_DENIED";
    return true;
  });

  // This function is for scrolling on the home page
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const section = document.querySelector(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Close the mobile menu on click
    setMenuOpen(false);
  };

  const OwnersLink = (
    <a
      href="/owners"
      onClick={(e) => {
        e.preventDefault();
        nav("/owners");
        // Close the mobile menu on click
        setMenuOpen(false);
      }}
    >
      Owners
    </a>
  );

  return (
    <header className="header">
      {/* 🔹 1. Logo */}
      <Link
        to="/"
        className="logo"
        // Close menu if logo is clicked
        onClick={() => setMenuOpen(false)}
      >
        LiquidSplit
      </Link>

      {/* 🔹 2. Hamburger Menu Icon */}
      <i
        className={menuOpen ? "bx bx-x" : "bx bx-menu"}
        id="menu-icon"
        onClick={() => setMenuOpen(!menuOpen)}
      ></i>

      {/* 🔹 3. Link Container */}
      {/* This 'nav' tag is the slide-down container */}
      <nav className={menuOpen ? "navbar active" : "navbar"}>
        
        {/* Central Navigation Links (Home page only) */}
        {showExtraLinks && (
          <div className="nav-center-links">
            <a
              href="#how-it-works"
              onClick={(e) => handleSmoothScroll(e, "#how-it-works")}
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={(e) => handleSmoothScroll(e, "#features")}
            >
              Features
            </a>
            {OwnersLink}
          </div>
        )}

        {/* Action Buttons (Far Right) */}
        <div className="nav-links">
          
          {/* --- HIDE "Get Started" if logged in --- */}
          {!isAuthenticated && (
            <Link 
              to="/get-started" 
              className="get-started"
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          )}

          {/* User Pots (Solid Button) */}
          {isAuthenticated && (
            <>
              <Link 
                to="/friends" 
                className="get-started"
                onClick={() => setMenuOpen(false)}
              >
                Friends
              </Link>
              <Link 
                to="/pots" 
                className="get-started"
                onClick={() => setMenuOpen(false)}
              >
                Your Pots
              </Link>

              {/* Notification Bell */}
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    background: "transparent",
                    border: "2px solid #7c3aed",
                    color: "#7c3aed",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    position: "relative",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#7c3aed";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#7c3aed";
                  }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        background: "#ef4444",
                        color: "white",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 0.5rem)",
                      right: 0,
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                      minWidth: "350px",
                      maxWidth: "400px",
                      maxHeight: "500px",
                      overflowY: "auto",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        padding: "1rem",
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: 600,
                        fontSize: "1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Notifications</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => setShowNotifications(false)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#6b7280",
                            cursor: "pointer",
                            fontSize: "1.2rem",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid #e5e7eb",
                        overflowX: "auto",
                      }}
                    >
                      {["ALL", "FRIEND_REQUESTS", "GROUP_INVITATIONS", "PAYMENTS"].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setNotificationFilter(filter)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            background: notificationFilter === filter ? "#7c3aed" : "#f3f4f6",
                            color: notificationFilter === filter ? "white" : "#374151",
                            border: "none",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                          }}
                        >
                          {filter === "ALL" && "All"}
                          {filter === "FRIEND_REQUESTS" && "Friends"}
                          {filter === "GROUP_INVITATIONS" && "Groups"}
                          {filter === "PAYMENTS" && "Payments"}
                        </button>
                      ))}
                    </div>

                    {filteredNotifications.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                        No notifications
                      </div>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          style={{
                            padding: "1rem",
                            borderBottom: "1px solid #f3f4f6",
                            background: notification.status === "UNREAD" ? "#fef3c7" : "white",
                          }}
                        >
                          <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#374151" }}>
                            {notification.message}
                          </div>
                          {notification.type === "PAYMENT_REQUEST" && (
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                              <button
                                onClick={() => handlePay(notification.id, notification.potId, user.id)}
                                disabled={loadingNotifications}
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  background: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: loadingNotifications ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {loadingNotifications ? "..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => handleDeny(notification.id, notification.potId, user.id)}
                                disabled={loadingNotifications}
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  background: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: loadingNotifications ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {loadingNotifications ? "..." : "Deny"}
                              </button>
                            </div>
                          )}
                          {notification.type === "FRIEND_REQUEST" && notification.friendRequest && (
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                              <button
                                onClick={() => handleAcceptFriendRequest(notification.id, notification.friendRequestId)}
                                disabled={loadingNotifications}
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  background: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: loadingNotifications ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {loadingNotifications ? "..." : "Accept"}
                              </button>
                              <button
                                onClick={() => handleDeclineFriendRequest(notification.id, notification.friendRequestId)}
                                disabled={loadingNotifications}
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  background: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: loadingNotifications ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {loadingNotifications ? "..." : "Decline"}
                              </button>
                            </div>
                          )}
                          {notification.type === "GROUP_INVITATION" && notification.groupInvitation && (
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                              <button
                                onClick={() => handleAcceptGroupInvitation(notification.id, notification.groupInvitationId)}
                                disabled={loadingNotifications}
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  background: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: loadingNotifications ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {loadingNotifications ? "..." : "Accept"}
                              </button>
                              <button
                                onClick={() => handleDeclineGroupInvitation(notification.id, notification.groupInvitationId)}
                                disabled={loadingNotifications}
                                style={{
                                  flex: 1,
                                  padding: "0.5rem",
                                  background: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.5rem",
                                  cursor: loadingNotifications ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {loadingNotifications ? "..." : "Decline"}
                              </button>
                            </div>
                          )}
                          {notification.type === "PAYMENT_DENIED" && (
                            <button
                              onClick={async () => {
                                try {
                                  setLoadingNotifications(true);
                                  const token = localStorage.getItem("token");
                                  await fetch(`http://localhost:4000/notifications/${notification.id}`, {
                                    method: "DELETE",
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  });
                                  setNotifications((prev) =>
                                    prev.filter((n) => n.id !== notification.id)
                                  );
                                } catch (error) {
                                  console.error("Error dismissing notification:", error);
                                } finally {
                                  setLoadingNotifications(false);
                                }
                              }}
                              disabled={loadingNotifications}
                              style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem 1rem",
                                background: "#6b7280",
                                color: "white",
                                border: "none",
                                borderRadius: "0.5rem",
                                cursor: loadingNotifications ? "not-allowed" : "pointer",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                width: "100%",
                              }}
                            >
                              {loadingNotifications ? "..." : "Dismiss"}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Log In / Profile (Secondary, Outlined Button) */}
          {isAuthenticated ? (
            <Link 
              to="/profile" 
              className="login-btn-nav"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="login-btn-nav"
              onClick={() => setMenuOpen(false)}
            >
              Log In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Nav;