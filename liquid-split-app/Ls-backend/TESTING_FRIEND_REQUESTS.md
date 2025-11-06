# Friend Request System - Testing Guide

## ✅ Implementation Complete

### What's Been Added:
1. **Friend Request Flow**: Pending → Accept/Decline system
2. **Notifications**: Toast (corner) + Banner (friends page top)
3. **Search Improvements**: Exact matches appear first
4. **Database Reset**: All old friendships cleared

---

## 🧪 How to Test

### Step 1: Open Two Browser Windows
- Window 1: Logged in as **test123**
- Window 2: Logged in as **test2** (or any other user)

### Step 2: Send Friend Request (Window 2)
1. Navigate to Friends page
2. Search for "test123" in the search box
3. Click "Add" button next to test123's profile
4. ✅ **Expected**: Toast notification appears: "Friend request sent successfully!"
5. ✅ **Expected**: Button changes to "Pending" (gray, disabled)

### Step 3: Receive & Accept Request (Window 1 - test123)
1. Navigate to Friends page (or refresh if already there)
2. ✅ **Expected**: Purple banner at top: "You have 1 friend request(s)"
3. ✅ **Expected**: Request shows with username/email and Accept/Decline buttons
4. Click "Accept" button
5. ✅ **Expected**: Toast notification: "Friend request accepted!"
6. ✅ **Expected**: Banner disappears
7. ✅ **Expected**: test2 now appears in "Your Friends" list

### Step 4: Verify Friendship (Window 2)
1. Navigate to Friends page (or refresh)
2. ✅ **Expected**: test123 now appears in "Your Friends" list
3. Search for "test123" again
4. ✅ **Expected**: Button shows "Friends" (green, disabled)

---

## 🎯 Features to Verify

### Toast Notifications (Corner of Screen)
- ✅ Appears in top-right corner
- ✅ Green background for success
- ✅ Red background for errors
- ✅ Auto-dismisses after 4 seconds
- ✅ Can be manually closed with X button
- ✅ Slides in from right (smooth animation)

### Friend Requests Banner (Top of Friends Page)
- ✅ Only shows when you have pending requests
- ✅ Shows count: "You have X friend request(s)"
- ✅ Lists each request with username/email
- ✅ Accept button (white background, purple text)
- ✅ Decline button (transparent white)
- ✅ Disappears after accepting/declining all requests

### Search Functionality
- ✅ Exact username match appears first
- ✅ Exact email match appears first
- ✅ Button states:
  - "Add" → Not friends yet (blue button)
  - "Pending" → You sent a request (gray, disabled)
  - "Respond" → They sent you a request (purple button)
  - "Friends" → Already friends (green, disabled)

---

## 🛠️ Database Commands

### Reset All Friendships (Start Fresh)
```bash
cd Ls-backend
node src/resetFriends.js
```

### Check Current Friendships (Prisma Studio)
```bash
cd Ls-backend
npx prisma studio
```
Then navigate to the `Friend` table in the browser

---

## 📝 API Endpoints (for reference)

- `POST /friends/add` - Send friend request
- `GET /friends` - Get accepted friends
- `GET /friends/requests` - Get pending incoming requests
- `POST /friends/accept/:requestId` - Accept a request
- `POST /friends/decline/:requestId` - Decline a request
- `GET /friends/search?query=...` - Search users with friend status

---

## 🐛 Troubleshooting

### "Friend request sent" but no banner appears on other user
- **Solution**: Refresh the page or navigate away and back to Friends page
- **Note**: Real-time notifications require WebSocket (not implemented yet)

### Button shows "Respond" in search but can't accept
- **Solution**: Scroll to top of Friends page and use the banner to accept/decline

### Toast notification doesn't auto-dismiss
- **Check**: Browser console for errors
- **Verify**: Auto-dismiss useEffect is in place (should dismiss after 4 seconds)

### Friendship appears one-way
- **Issue**: Only accepted friendships are bidirectional
- **Solution**: Make sure the request was accepted (not still pending)

---

## ✨ Next Enhancements (Future)

- Real-time notifications (WebSocket/Socket.io)
- Friend request expiration (auto-decline after 30 days)
- Block user functionality
- Friend recommendations
- Notification sound/badge

---

**Last Updated**: Implementation complete ✅  
**Database**: All friendships reset (clean slate)  
**Status**: Ready for testing!
