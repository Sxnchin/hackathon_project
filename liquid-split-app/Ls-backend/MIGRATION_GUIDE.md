# Friends & Groups Database Migration

## Run this command to apply the new database schema:

```bash
cd Ls-backend
npx prisma migrate dev --name add_friends_and_groups
```

This will:
1. Create a new migration file
2. Apply the migration to your database
3. Regenerate the Prisma Client with the new models

## New Models Added:

### Friend Model
- Stores friendships between users
- Bidirectional relationships (both directions created for easier queries)
- Status field for future friend request functionality

### Group Model  
- Allows users to create named groups of friends
- Tracks the creator of each group

### GroupMember Model
- Join table linking users to groups
- Prevents duplicate memberships

## After Migration:

The backend will be ready to use. The frontend is already updated to use the new API endpoints.

## Testing:

1. Register/login to get a JWT token
2. Search for users: GET /friends/search?query=bob
3. Add a friend: POST /friends/add { friendId: 2 }
4. Get friends: GET /friends
5. Create group: POST /groups { name: "My Group", memberIds: [2, 3] }
6. Get groups: GET /groups
