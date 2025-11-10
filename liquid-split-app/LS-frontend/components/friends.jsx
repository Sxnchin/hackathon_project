import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './friends.css';
import { useAuth } from '../src/utils/authContext';

function Friends() {
  const { user } = useAuth();
  
  // --- State Management ---
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupInvitations, setGroupInvitations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [friendsCollapsed, setFriendsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const [hoveredGroupId, setHoveredGroupId] = useState(null);
  const [hoveredFriendId, setHoveredFriendId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState(null);
  const [inviteMembers, setInviteMembers] = useState([]);

  // --- Listen for friends:refresh event from notifications ---
  useEffect(() => {
    const handleFriendsRefresh = () => {
      loadFriendRequests();
      loadFriends();
    };

    window.addEventListener("friends:refresh", handleFriendsRefresh);
    return () => window.removeEventListener("friends:refresh", handleFriendsRefresh);
  }, []);

  // --- Load friends and groups on mount ---
  useEffect(() => {
    async function loadInitialData() {
      setDataLoading(true);
      await Promise.all([
        loadFriends(),
        loadFriendRequests(),
        loadGroups(),
        loadGroupInvitations()
      ]);
      setDataLoading(false);
    }
    loadInitialData();
  }, []);

  // --- Search users as user types with debounce ---
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        searchUsers();
      } else {
        setSearchResults([]);
        setSearchLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
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

  const loadGroupInvitations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/groups/invitations/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGroupInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Error loading group invitations:', err);
    }
  };

  const searchUsers = async () => {
    try {
      setSearchLoading(true);
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
    } finally {
      setSearchLoading(false);
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

  // Remove friend
  const handleRemoveFriend = async (friendId, friendName) => {
    if (!window.confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: `${friendName} removed from friends`,
        });
        await loadFriends();
        await loadGroups(); // Refresh groups in case they were in groups together
      } else {
        const data = await res.json();
        setNotification({
          type: 'error',
          message: data.error || 'Failed to remove friend',
        });
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      setNotification({
        type: 'error',
        message: 'Failed to remove friend',
      });
    }
  };

  const handleAcceptGroupInvitation = async (invitationId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/groups/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Group invitation accepted!',
        });
        await loadGroups();
        await loadGroupInvitations();
      } else {
        const data = await res.json();
        setNotification({
          type: 'error',
          message: data.error || 'Failed to accept invitation',
        });
      }
    } catch (err) {
      console.error('Error accepting group invitation:', err);
      setNotification({
        type: 'error',
        message: 'Failed to accept invitation',
      });
    }
  };

  const handleDeclineGroupInvitation = async (invitationId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/groups/invitations/${invitationId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Group invitation declined',
        });
        await loadGroupInvitations();
      } else {
        const data = await res.json();
        setNotification({
          type: 'error',
          message: data.error || 'Failed to decline invitation',
        });
      }
    } catch (err) {
      console.error('Error declining group invitation:', err);
      setNotification({
        type: 'error',
        message: 'Failed to decline invitation',
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

  // Toggle friend for inviting to existing group
  const handleToggleFriendForInvite = (friendId) => {
    setInviteMembers(prevMembers =>
      prevMembers.includes(friendId)
        ? prevMembers.filter(id => id !== friendId)
        : [...prevMembers, friendId]
    );
  };

  // Open invite modal
  const handleOpenInviteModal = (groupId) => {
    setInviteGroupId(groupId);
    setInviteMembers([]);
    setShowInviteModal(true);
  };

  // Send invitations
  const handleSendInvitations = async (e) => {
    e.preventDefault();
    if (inviteMembers.length === 0) {
      alert('Please select at least one friend to invite.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/groups/${inviteGroupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds: inviteMembers })
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.message || 'Invitations sent!',
        });
        setShowInviteModal(false);
        setInviteMembers([]);
        await loadGroups();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to send invitations',
        });
      }
    } catch (err) {
      console.error('Error sending invitations:', err);
      setNotification({
        type: 'error',
        message: 'Failed to send invitations',
      });
    } finally {
      setLoading(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId, groupName) => {
    if (!window.confirm(`Are you sure you want to leave "${groupName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.message || 'Left group successfully',
        });
        await loadGroups();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to leave group',
        });
      }
    } catch (err) {
      console.error('Error leaving group:', err);
      setNotification({
        type: 'error',
        message: 'Failed to leave group',
      });
    }
  };

  // Remove member (creator only)
  const handleRemoveMember = async (groupId, userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from this group?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.message || 'Member removed successfully',
        });
        await loadGroups();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to remove member',
        });
      }
    } catch (err) {
      console.error('Error removing member:', err);
      setNotification({
        type: 'error',
        message: 'Failed to remove member',
      });
    }
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
        const data = await res.json();
        const invitationCount = data.group?.invitations?.length || 0;
        
        setNotification({
          type: 'success',
          message: `Group created! ${invitationCount} invitation${invitationCount !== 1 ? 's' : ''} sent.`,
        });
        
        // Reload groups and invitations
        await loadGroups();
        await loadGroupInvitations();
        
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
          <motion.div 
            className="sidebar-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h3 
              onClick={() => setFriendsCollapsed(!friendsCollapsed)}
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👥 My Friends
                {friends.length > 0 && (
                  <span style={{
                    background: '#7c3aed',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {friends.length}
                  </span>
                )}
              </span>
              <motion.span 
                style={{ fontSize: '1.2rem' }}
                animate={{ rotate: friendsCollapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                ▲
              </motion.span>
            </h3>
            <AnimatePresence>
              {!friendsCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#9ca3af' }}>
                      <div className="loading-spinner" style={{
                        border: '3px solid #f3f4f6',
                        borderTop: '3px solid #7c3aed',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                      }} />
                      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading friends...</p>
                    </div>
                  ) : friends.length > 0 ? (
                    <ul className="user-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {friends.map(friend => (
                        <motion.li 
                          key={friend.id} 
                          className="user-list-item"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          onMouseEnter={() => setHoveredFriendId(friend.id)}
                          onMouseLeave={() => setHoveredFriendId(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: hoveredFriendId === friend.id ? '#f9fafb' : 'transparent',
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                        >
                          <img 
                            src={`https://placehold.co/40x40/7c3aed/ffffff?text=${friend.name[0]}`} 
                            alt={friend.name}
                            style={{ 
                              borderRadius: '50%',
                              width: '40px',
                              height: '40px',
                              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)'
                            }}
                          />
                          <span style={{ flex: 1, fontWeight: '500', color: '#374151' }}>{friend.name}</span>
                          <AnimatePresence>
                            {hoveredFriendId === friend.id && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFriend(friend.id, friend.name);
                                }}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                ✕ Remove
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem 1rem',
                      color: '#9ca3af',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👋</div>
                      <p>No friends yet.</p>
                      <p style={{ fontSize: '0.85rem' }}>Search for users to add friends!</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div 
            className="sidebar-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h3 
              onClick={() => setGroupsCollapsed(!groupsCollapsed)}
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👨‍👩‍👦 My Groups
                {groups.length > 0 && (
                  <span style={{
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {groups.length}
                  </span>
                )}
              </span>
              <motion.span 
                style={{ fontSize: '1.2rem' }}
                animate={{ rotate: groupsCollapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                ▲
              </motion.span>
            </h3>
            <AnimatePresence>
              {!groupsCollapsed && (
                <motion.ul 
                  className="group-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Pending Group Invitations */}
                  {groupInvitations.map(invitation => (
                    <li 
                      key={`invitation-${invitation.id}`} 
                      className="group-list-item group-invitation-item"
                      onMouseEnter={() => setHoveredGroupId(`inv-${invitation.id}`)}
                      onMouseLeave={() => setHoveredGroupId(null)}
                      style={{ position: 'relative', borderLeft: '4px solid #fbbf24' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>{invitation.group.name}</strong>
                          <span className="pending-badge" style={{ 
                            backgroundColor: '#fbbf24', 
                            color: '#000', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            PENDING
                          </span>
                        </div>
                        <span className="member-count" style={{ fontSize: '0.85rem', color: '#888' }}>
                          From: {invitation.group.creator.name}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <button 
                            onClick={() => handleAcceptGroupInvitation(invitation.id)}
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleDeclineGroupInvitation(invitation.id)}
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                      
                      {/* Tooltip showing current members */}
                      <AnimatePresence>
                        {hoveredGroupId === `inv-${invitation.id}` && invitation.group.members.length > 0 && (
                          <motion.div
                            className="group-members-tooltip"
                            initial={{ opacity: 0, x: -10, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="tooltip-header">Current Members</div>
                            <ul className="tooltip-member-list">
                              {invitation.group.members.map(member => (
                                <li key={member.user.id}>
                                  <span className="member-name">{member.user.name}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  ))}

                  {/* Accepted Groups */}
                  {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#9ca3af' }}>
                      <div className="loading-spinner" style={{
                        border: '3px solid #f3f4f6',
                        borderTop: '3px solid #10b981',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                      }} />
                      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading groups...</p>
                    </div>
                  ) : groups.length > 0 ? (
                    groups.map(group => (
                      <motion.li 
                        key={group.id} 
                        className="group-list-item"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        onMouseEnter={() => setHoveredGroupId(group.id)}
                        onMouseLeave={() => setHoveredGroupId(null)}
                        style={{ 
                          position: 'relative',
                          padding: '0.875rem',
                          borderRadius: '0.5rem',
                          background: hoveredGroupId === group.id ? '#f0fdf4' : '#f9fafb',
                          transition: 'all 0.2s',
                          border: `2px solid ${hoveredGroupId === group.id ? '#10b981' : 'transparent'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                          {/* Group Icon */}
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            color: 'white',
                            fontWeight: 'bold',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                          }}>
                            {group.name[0].toUpperCase()}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.125rem' }}>
                              {group.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                👥 {group.members.length} {group.members.length === 1 ? 'Member' : 'Members'}
                              </span>
                              {/* Show pending invitations count if user is creator */}
                              {group.creator.id === user?.id && group.invitations && group.invitations.length > 0 && (
                                <span style={{
                                  backgroundColor: '#fbbf24',
                                  color: '#000',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold'
                                }}>
                                  ⏳ {group.invitations.length} pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      
                      {/* Enhanced Tooltip with all features */}
                      <AnimatePresence>
                        {hoveredGroupId === group.id && (
                          <motion.div
                            className="group-members-tooltip"
                            initial={{ opacity: 0, x: -10, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            style={{ width: '280px', maxHeight: '400px', overflowY: 'auto' }}
                          >
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInviteModal(group.id);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '0.625rem',
                                  backgroundColor: '#7c3aed',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.375rem'
                                }}
                              >
                                <span>➕</span> Invite
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLeaveGroup(group.id, group.name);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '0.625rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.375rem'
                                }}
                              >
                                <span>🚪</span> Leave
                              </motion.button>
                            </div>

                            {/* Members List */}
                            <div className="tooltip-header">Members</div>
                            <ul className="tooltip-member-list" style={{ marginBottom: '0.5rem' }}>
                              {group.members.map(member => (
                                <li key={member.user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="member-name">{member.user.name}</span>
                                    {member.user.id === group.creatorId && (
                                      <span style={{
                                        padding: '1px 5px',
                                        backgroundColor: '#7c3aed',
                                        color: 'white',
                                        borderRadius: '6px',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold'
                                      }}>
                                        Creator
                                      </span>
                                    )}
                                  </div>
                                  {group.creatorId === user?.id && member.user.id !== user?.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMember(group.id, member.user.id, member.user.name);
                                      }}
                                      style={{
                                        padding: '2px 6px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>

                            {/* Pending Invitations */}
                            {group.creator.id === user?.id && group.invitations && group.invitations.length > 0 && (
                              <>
                                <div className="tooltip-header" style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.5rem' }}>
                                  Pending Invites
                                </div>
                                <ul className="tooltip-member-list">
                                  {group.invitations.map(inv => (
                                    <li key={inv.user.id}>
                                      <span className="member-name" style={{ opacity: 0.7 }}>{inv.user.name} (pending)</span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem 1rem',
                      color: '#9ca3af',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
                      <p>No groups yet.</p>
                      <p style={{ fontSize: '0.85rem' }}>Create a group to get started!</p>
                    </div>
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        </aside>

        {/* --- Column 2: Search & Create --- */}
        <main className="friends-main">
          <motion.div 
            className="main-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ padding: '2rem' }}
          >
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 Find Users
            </h3>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="friends-search-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim()) {
                    setSearchLoading(true);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 2.75rem',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#f9fafb'
                }}
                onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.25rem',
                color: '#9ca3af'
              }}>🔍</span>
            </div>

            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div className="loading-spinner" style={{
                  border: '3px solid #f3f4f6',
                  borderTop: '3px solid #7c3aed',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
                <p style={{ marginTop: '1rem', color: '#9ca3af', fontSize: '0.9rem' }}>Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="user-list search-results" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {searchResults.map(foundUser => {
                  const isSelf = foundUser.id === user?.id;
                  const status = foundUser.friendStatus;
                  
                  let buttonText = 'Add Friend';
                  let buttonDisabled = false;
                  let buttonColor = '#7c3aed';
                  
                  if (isSelf) {
                    buttonText = 'You';
                    buttonDisabled = true;
                    buttonColor = '#9ca3af';
                  } else if (status === 'accepted') {
                    buttonText = '✓ Friends';
                    buttonDisabled = true;
                    buttonColor = '#10b981';
                  } else if (status === 'pending') {
                    buttonText = '⏳ Pending';
                    buttonDisabled = true;
                    buttonColor = '#f59e0b';
                  } else if (status === 'received') {
                    buttonText = 'Respond';
                    buttonDisabled = false;
                    buttonColor = '#7c3aed';
                  }
                  
                  return (
                    <motion.li 
                      key={foundUser.id} 
                      className="user-list-item"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#7c3aed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <img 
                        src={`https://placehold.co/48x48/7c3aed/ffffff?text=${foundUser.name[0]}`} 
                        alt={foundUser.name}
                        style={{ 
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                          {foundUser.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          {foundUser.email}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: buttonDisabled ? 1 : 1.05 }}
                        whileTap={{ scale: buttonDisabled ? 1 : 0.95 }}
                        onClick={() => handleAddFriend(foundUser.id)}
                        disabled={buttonDisabled}
                        style={{
                          padding: '0.625rem 1.25rem',
                          background: buttonColor,
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                          opacity: buttonDisabled ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          boxShadow: buttonDisabled ? 'none' : '0 2px 4px rgba(124, 58, 237, 0.3)'
                        }}
                      >
                        {buttonText}
                      </motion.button>
                    </motion.li>
                  );
                })}
              </ul>
            ) : searchTerm.trim() ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🤷</div>
                <p>No users found matching "{searchTerm}"</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👆</div>
                <p>Start typing to search for users</p>
              </div>
            )}
          </motion.div>

          <motion.div 
            className="main-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              padding: '2.5rem',
              background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ color: 'white', borderBottom: 'none', paddingBottom: 0, marginBottom: '1rem' }}>
              Create a Group
            </h3>
            <p style={{ marginBottom: '1.5rem', opacity: 0.95, fontSize: '1rem' }}>
              Create a new group from your existing friends list.
            </p>
            <motion.button 
              className="cta-btn" 
              onClick={() => setShowCreateGroup(true)}
              whileHover={{ scale: 1.05, boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '1rem 2rem',
                background: 'white',
                color: '#7c3aed',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              ✨ Create New Group
            </motion.button>
          </motion.div>
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

      {/* --- Invite Members Modal --- */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSendInvitations}>
                <div className="modal-header">
                  <h2>Invite Friends to Group</h2>
                  <button type="button" className="close-btn" onClick={() => setShowInviteModal(false)}>
                    &times;
                  </button>
                </div>
                
                <div className="modal-body">
                  <h4>Select Friends to Invite</h4>
                  <ul className="friend-select-list">
                    {friends.map(friend => (
                      <li
                        key={friend.id}
                        className={inviteMembers.includes(friend.id) ? 'selected' : ''}
                        onClick={() => handleToggleFriendForInvite(friend.id)}
                      >
                        <img src={`https://placehold.co/40x40/7c3aed/ffffff?text=${friend.name[0]}`} alt={friend.name} />
                        <span>{friend.name}</span>
                        <div className="checkbox-fake">
                          {inviteMembers.includes(friend.id) && '✓'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Send Invitations
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
