const http = require('http');
var cors = require('cors');
const express = require('express');
const PIXI = require('pixi.js');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
	}
});

const gameQueue = [];
const gameRooms = new Map();
const playerRooms = new Map();
const gameState = {
	ready: 0,
	points: {
		player: 0,
		opponent: 0,
	},
	ballMotion: {
		x: 0.01,
		y: 0.01,
		angle: 1
	},
	ball: {
		height: 0.05,
		width: 0.05,
		x: 0.5,
		y: 0.5
	},
	player: {
		height: 0.2,
		width: 0.05,
		x: 0,
		y: 0.5
	},
	opponent: {
		x: 1,
		y: 0.5
	},
};

app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST'], }));

function startTicker(socketId) {
	const playerRoom = playerRooms.get(socketId);
	if (playerRoom) {
		console.log("Starting game loop")
		const room = gameRooms.get(playerRoom.roomId);
		if (room) {
			const ballMotion = room.gameState.ballMotion;
			const ball = room.gameState.ball;
			const player = room.gameState.player;

			setInterval(() => {
				const motionX = Math.cos(ballMotion.angle) * ballMotion.x;
				const motionY = Math.sin(ballMotion.angle) * ballMotion.y;

				if ((ball.x >= 1 && motionX > 0))
					ballMotion.angle = Math.PI - ballMotion.angle;

				// Player collide logic
				if (
					ball.x <= player.x + player.width / 2 + ball.width / 2 &&
					ball.x >= player.x - player.width / 2 - ball.width / 2 &&
					ball.y <= player.y + player.height / 2 &&
					ball.y >= player.y - player.height / 2 &&
					motionX < 0
				) {
					ballMotion.angle = (ball.y - player.y) / player.height;
					ballMotion.x *= 1.05;
					ballMotion.y *= 1.05;
				}

				if ((ball.y >= 1 - ball.width / 2 && motionY > 0) || (ball.y <= 0 + ball.width / 2 && motionY < 0))
					ballMotion.angle = -ballMotion.angle;

				if (ball.x < 0) {
					ball.x = 0.5;
					ball.y = 0.5;
					const minAngle = (180 * Math.PI) / 180;
					const maxAngle = (260 * Math.PI) / 180;
					ballMotion.angle = minAngle + Math.random() * (maxAngle - minAngle);
					ballMotion.x = 0.01;
					ballMotion.y = 0.01;
				}

				ball.x += motionX;
				ball.y += motionY;

				// Emit the updated game state to all clients
				io.to(room.roomId).emit("gameState", room.gameState);
			}, 1000 / 60)
		}
	}
}

io.on('connection', (socket) => {
	// Store the socket ID when a client connects
	console.log("Socket ID: ", socket.id);
	socket.join("all");

	socket.on('movement', (direction) => {
		const playerRoom = playerRooms.get(socket.id);
		if (playerRoom) {
			const room = gameRooms.get(playerRoom.roomId);
			if (room) {
				if (playerRoom.role === 'player') {
					if (direction === 'down') {
						room.gameState.player.y += 0.05;
						room.gameState.player.y = Math.min(0.9, room.gameState.player.y);
					}
					else {
						room.gameState.player.y -= 0.05;
						room.gameState.player.y = Math.max(0.1, room.gameState.player.y);
					}
				}
				else {
					if (direction === 'down') {
						room.gameState.opponent.y += 0.05;
						room.gameState.opponent.y = Math.min(0.9, room.gameState.opponent.y);
					}
					else {
						room.gameState.opponent.y -= 0.05;
						room.gameState.opponent.y = Math.max(0.1, room.gameState.opponent.y);
					}
				}
				socket.to(room.roomId).emit("gameState", room.gameState);
				socket.emit("gameState", room.gameState);
			}
		}
	});

	// Start the game loop
	socket.on('ready', () => {
		const roomId = getRoomId(socket.id);
		if (roomId) {
			console.log("I'm ready: ", socket.id);
			const gameRoom = gameRooms.get(roomId);
			if (gameRoom.gameState.ready == 1)
				startTicker(socket.id);
			gameRoom.gameState.ready++;

		}
	});

	socket.on('joinRoom', (roomId) => {
		console.log("RoomID: ", roomId);
		socket.join(roomId);
		socket.emit("goToGame");
	})

	socket.on('joinQueue', () => {
		console.log("Join queue is called")
		if (gameQueue.length >= 1) {
			const room = createRoom(socket.id, gameQueue[0]);
			console.log(gameQueue);
			gameQueue.shift();
			socket.emit('matchFound', { roomId: room.roomId, role: "player" });
			socket.to(room.opponentId).emit('matchFound', { roomId: room.roomId, role: "opponent" });
		}
		else {
			gameQueue.push(socket.id);
		}
	});

	socket.on('disconnect', () => {
		// console.log(`Player ${socket.id} disconnected`);
		const playerRoom = playerRooms.get(socket.id);
		const queueIndex = gameQueue.findIndex((e) => socket.id === e);
		if (queueIndex !== -1)
			gameQueue.splice(queueIndex, 1);
		if (playerRoom !== undefined) {
			socket.leave(playerRoom.roomId);
			const gameRoom = gameRooms.get(playerRoom.roomId);
			if (gameRoom !== undefined) {
				if (playerRoom.role === "player") {
					if (playerRooms.get(gameRoom.opponentId) === undefined)
						gameRooms.delete(gameRoom.roomId);
				}
			}
			playerRooms.delete(socket.id);
		}
	});

});

function createRoom(playerId, opponentId) {
	const roomId = 'room_' + Math.random().toString(36).substring(2, 9);
	const room = {
		roomId,
		playerId,
		opponentId,
		gameState: { ...gameState }
	};
	console.log("Player id: ", playerId);
	console.log("Opponent id: ", opponentId);
	playerRooms.set(playerId, { roomId, role: "player" });
	playerRooms.set(opponentId, { roomId, role: "opponent" });
	gameRooms.set(roomId, room);
	return (room);
}

function getRoomId(socketId) {
	const playerRoom = playerRooms.get(socketId);
	if (playerRoom !== undefined)
		return (playerRoom.roomId);
	return (undefined);
}

server.listen(3001, () => {
	console.log('Server is running on port 3001');
});
