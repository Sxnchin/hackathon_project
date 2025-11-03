import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../src/styles/friends.css'; // We'll create this file next
import { useAuth } from '../src/utils/authContext';
// --- Mock Data ---
// In a real app, this would come from your database
const MOCK_USERS = [
  { id: 1, name: 'Alice Green', email: 'alice@example.com' },
  { id: 2, name: 'Bob Johnson', email: 'bob@example.com' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
  { id: 4, name: 'David Lee', email: 'david@example.com' },
  { id: 5, name: 'Emily White', email: 'emily@example.com' },
  { id: 6, name: 'Frank Black', email: 'frank@example.com' },
  { id: 7, name: 'Grace Hall', email: 'grace@example.com' },
];
// --------------------

function Friends() {
  const { user } = useAuth(); // Get the current user
  
  // --- State Management ---
  const [friends, setFriends] = useState([2, 3]); // Mock: User is already friends with Bob (2) and Charlie (3)
  const [groups, setGroups] = useState([
    { id: 'g1', name: 'Weekend Trip', members: [2] }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]); // Holds friend IDs for the new group

  // --- Memos ---
  // Memoize friend objects from their IDs
  const friendObjects = useMemo(() => {
    return MOCK_USERS.filter(u => friends.includes(u.id));
  }, [friends]);

  // Memoize search results
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return MOCK_USERS.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // --- Handlers ---
  const handleAddFriend = (userId) => {
    if (!friends.includes(userId) && userId !== user?.id) { // Can't add self
      setFriends(prevFriends => [...prevFriends, userId]);
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
  const handleSaveGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || groupMembers.length === 0) {
      alert('Please provide a group name and select at least one friend.');
      return;
    }

    const newGroup = {
      id: `g${groups.length + 1}`,
      name: newGroupName,
      members: groupMembers,
    };

    setGroups(prevGroups => [...prevGroups, newGroup]);
    
    // Reset form
    setShowCreateGroup(false);
    setNewGroupName('');
    setGroupMembers([]);
  };

  return (
    <div className="friends-page-container">
      {/* --- Main Content Grid --- */}
      <div className="friends-grid">
        
        {/* --- Column 1: My Friends & Groups --- */}
        <aside className="friends-sidebar">
          <div className="sidebar-widget">
            <h3>My Friends</h3>
            <ul className="user-list">
              {friendObjects.length > 0 ? (
                friendObjects.map(friend => (
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
                const isFriend = friends.includes(foundUser.id);
                const isSelf = foundUser.id === user?.id; // Check if it's the current user
                return (
                  <li key={foundUser.id} className="user-list-item">
                    <img src={`https://placehold.co/40x40/a7a7a7/ffffff?text=${foundUser.name[0]}`} alt={foundUser.name} />
                    <span>{foundUser.name} <small>({foundUser.email})</small></span>
                    <button
                      className="add-friend-btn"
                      onClick={() => handleAddFriend(foundUser.id)}
                      disabled={isFriend || isSelf} // Disable if already friend or is self
                    >
                      {isSelf ? 'You' : isFriend ? 'Friend' : 'Add'}
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
                    {friendObjects.map(friend => (
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
