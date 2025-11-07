import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './friends.css'; // We'll create this file next
import { useAuth } from '../src/utils/authContext';

function Friends() {
  const { user } = useAuth(); // Get the current user
  
  // --- State Management ---
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]); // Holds friend IDs for the new group
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null); // Toast notification

  // --- Load friends and groups on mount ---
  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    loadGroups();
  }, []);

  // --- Search users as user types ---
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  // --- Auto-dismiss notifications after 4 seconds ---
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- API Calls ---
  const loadFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/friends/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const newRequests = data.requests || [];
        setFriendRequests(newRequests);
        
        // Show notification if there are new requests
        if (newRequests.length > 0) {
          setNotification({
            type: 'info',
            message: `You have ${newRequests.length} pending friend request${newRequests.length > 1 ? 's' : ''}`,
          });
        }
      }
    } catch (err) {
      console.error('Error loading friend requests:', err);
    }
  };

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const searchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/friends/search?query=${encodeURIComponent(searchTerm)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  // --- Handlers ---
  const handleAddFriend = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendId })
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Friend request sent!',
        });
        // Reload search results
        if (searchTerm) {
          await searchUsers();
        }
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to send friend request',
        });
      }
    } catch (err) {
      console.error('Error adding friend:', err);
      setNotification({
        type: 'error',
        message: 'Failed to send friend request',
      });
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Friend request accepted!',
        });
        await loadFriends();
        await loadFriendRequests();
      } else {
        const data = await res.json();
        setNotification({
          type: 'error',
          message: data.error || 'Failed to accept request',
        });
      }
    } catch (err) {
      console.error('Error accepting request:', err);
      setNotification({
        type: 'error',
        message: 'Failed to accept request',
      });
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/friends/decline/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Friend request declined',
        });
        await loadFriendRequests();
      } else {
        const data = await res.json();
        setNotification({
          type: 'error',
          message: data.error || 'Failed to decline request',
        });
      }
    } catch (err) {
      console.error('Error declining request:', err);
      setNotification({
        type: 'error',
        message: 'Failed to decline request',
      });
    }
  };

  // Toggle friend for the new group
  const handleToggleFriendForGroup = (friendId) => {
    setGroupMembers(prevMembers =>
      prevMembers.includes(friendId)
        ? prevMembers.filter(id => id !== friendId)
        : [...prevMembers, friendId]
    );
  };

  // Create the new group
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || groupMembers.length === 0) {
      alert('Please provide a group name and select at least one friend.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          memberIds: groupMembers
        })
      });

      if (res.ok) {
        // Reload groups
        await loadGroups();
        
        // Reset form
        setShowCreateGroup(false);
        setNewGroupName('');
        setGroupMembers([]);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="friends-page-container">
      {/* --- Toast Notification (corner) --- */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`toast-notification toast-${notification.type}`}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Friend Requests Banner (top of page) --- */}
      {friendRequests.length > 0 && (
        <motion.div
          className="friend-requests-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>🔔 Friend Requests ({friendRequests.length})</h3>
          <ul className="requests-list">
            {friendRequests.map((request) => (
              <li key={request.requestId} className="request-item">
                <img 
                  src={`https://placehold.co/40x40/7c3aed/ffffff?text=${request.name[0]}`} 
                  alt={request.name} 
                />
                <span>{request.name}</span>
                <div className="request-actions">
                  <button 
                    className="accept-btn" 
                    onClick={() => handleAcceptRequest(request.requestId)}
                  >
                    Accept
                  </button>
                  <button 
                    className="decline-btn" 
                    onClick={() => handleDeclineRequest(request.requestId)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* --- Main Content Grid --- */}
      <div className="friends-grid">
        
        {/* --- Column 1: My Friends & Groups --- */}
        <aside className="friends-sidebar">
          <div className="sidebar-widget">
            <h3>My Friends</h3>
            <ul className="user-list">
              {friends.length > 0 ? (
                friends.map(friend => (
                  <li key={friend.id} className="user-list-item">
                    <img src={`https://placehold.co/40x40/7c3aed/ffffff?text=${friend.name[0]}`} alt={friend.name} />
                    <span>{friend.name}</span>
                  </li>
                ))
              ) : (
                <p className="empty-state">Search for users to add friends.</p>
              )}
            </ul>
          </div>

          <div className="sidebar-widget">
            <h3>My Groups</h3>
            <ul className="group-list">
              {groups.map(group => (
                <li key={group.id} className="group-list-item">
                  <strong>{group.name}</strong>
                  <span className="member-count">{group.members.length} Member{group.members.length !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* --- Column 2: Search & Create --- */}
        <main className="friends-main">
          <div className="main-widget">
            <h3>Find Users</h3>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="friends-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className="user-list search-results">
              {searchResults.map(foundUser => {
                const isSelf = foundUser.id === user?.id;
                const status = foundUser.friendStatus; // "none", "pending", "received", "accepted"
                
                let buttonText = 'Add';
                let buttonDisabled = false;
                
                if (isSelf) {
                  buttonText = 'You';
                  buttonDisabled = true;
                } else if (status === 'accepted') {
                  buttonText = 'Friends';
                  buttonDisabled = true;
                } else if (status === 'pending') {
                  buttonText = 'Pending';
                  buttonDisabled = true;
                } else if (status === 'received') {
                  buttonText = 'Respond';
                  buttonDisabled = false;
                }
                
                return (
                  <li key={foundUser.id} className="user-list-item">
                    <img src={`https://placehold.co/40x40/a7a7a7/ffffff?text=${foundUser.name[0]}`} alt={foundUser.name} />
                    <span>{foundUser.name} <small>({foundUser.email})</small></span>
                    <button
                      className="add-friend-btn"
                      onClick={() => handleAddFriend(foundUser.id)}
                      disabled={buttonDisabled}
                    >
                      {buttonText}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="main-widget">
            <h3>Create a Group</h3>
            <p>Create a new group from your existing friends list.</p>
            <button className="cta-btn" onClick={() => setShowCreateGroup(true)}>
              Create New Group
            </button>
          </div>
        </main>
      </div>

      {/* --- Create Group Modal --- */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            className="friends-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="friends-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <form onSubmit={handleSaveGroup}>
                <div className="modal-header">
                  <h2>Create New Group</h2>
                  <button
                    type="button"
                    className="close-modal-btn"
                    onClick={() => setShowCreateGroup(false)}
                  >
                    &times;
                  </button>
                </div>
                
                <div className="modal-body">
                  <label htmlFor="groupName">Group Name</label>
                  <input
                    type="text"
                    id="groupName"
                    placeholder="e.g., Alps Ski Trip, Project Phoenix"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />

                  <h4>Select Friends</h4>
                  <ul className="friend-select-list">
                    {friends.map(friend => (
                      <li
                        key={friend.id}
                        className={groupMembers.includes(friend.id) ? 'selected' : ''}
                        onClick={() => handleToggleFriendForGroup(friend.id)}
                      >
                        <img src={`https://placehold.co/40x40/7c3aed/ffffff?text=${friend.name[0]}`} alt={friend.name} />
                        <span>{friend.name}</span>
                        <div className="checkbox-fake">
                          {groupMembers.includes(friend.id) && '✓'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowCreateGroup(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Group
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Friends;
