// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for all routes

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your React app's address
    methods: ["GET", "POST"]
  }
});

// Application state
let splitState = {
    totalAmount: 300,
    participants: [],
};

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Handler for starting the split
    socket.on('start-split', () => {
        console.log(`[SERVER] Event 'start-split' received from ${socket.id}`);
        splitState.participants = [
            { id: 1, name: 'You', share: 100, status: 'pending' },
            { id: 2, name: 'Alex', share: 100, status: 'pending' },
            { id: 3, name: 'Jordan', share: 100, status: 'pending' },
        ];
        // Broadcast the initial state to all clients
        io.emit('update-split-status', splitState);
    });

    // Handler for a user paying their share
    socket.on('user-paid', ({ userId }) => {
        console.log(`[SERVER] Event 'user-paid' received for userId: ${userId}`);
        const user = splitState.participants.find(p => p.id === userId);
        if (user && user.status === 'pending') {
            user.status = 'paid';
            // Broadcast the updated state
            io.emit('update-split-status', splitState);

            // Check if all participants have paid
            const allPaid = splitState.participants.every(p => p.status === 'paid');
            if (allPaid) {
                console.log('[SERVER] All users have paid. Completing split...');
                setTimeout(() => {
                    const receipts = splitState.participants.map(p => ({
                        owner: p.name,
                        value: p.share,
                        ownership: "33.33%",
                        nftId: `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
                    }));
                    io.emit('split-complete', { receipts });
                    // Reset state for next time
                    splitState.participants = [];
                }, 1000);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));