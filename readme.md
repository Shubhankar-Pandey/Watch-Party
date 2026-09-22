# Watch Party

A real-time YouTube Watch Party application that allows multiple users to join a shared room and watch YouTube videos together. The application keeps video playback synchronized across participants using WebSockets and provides role-based access control for managing playback and participants.

---

## Features

- User signup and login
- JWT-based authentication
- Create a Watch Party room
- Join an existing room
- Real-time communication using WebSockets
- Synchronized YouTube playback
  - Play
  - Pause
  - Seek
  - Change video
- Room-based participant management
- Role-based access control
  - Host
  - Participant
  - Moderator
- Host can assign roles to participants
- Host can remove participants
- Participants receive room and role updates in real time
- Multiple users can participate in the same room
- PostgreSQL database for persistent application data

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- Node.js
- Express.js
- TypeScript
- JWT

### Real-Time Communication

- WebSocket

### Database

- PostgreSQL
- Neon
- Prisma

### Deployment

- Frontend: Vercel
- Backend: Render
- WebSocket Server: Render
- Database: Neon

---

## Architecture

The application is divided into three main parts:

```text
                    ┌─────────────────────┐
                    │      Frontend       │
                    │   React + Vite      │
                    └──────────┬──────────┘
                               │
                    HTTP       │       WebSocket
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐          ┌────────▼────────┐
        │     Express    │          │ WebSocket Server │
        │     Server     │          │                  │
        │                │          │ RoomManager      │
        │ /signup        │          │ Room             │
        │ /login         │          │ Event Handling   │
        └───────┬────────┘          └────────┬─────────┘
                │                            │
                └────────────┬───────────────┘
                             │
                     ┌───────▼────────┐
                     │   PostgreSQL   │
                     │      Neon      │
                     └────────────────┘




Express Server

The Express server handles HTTP-based functionality such as:

User signup
User login
Authentication
Database interaction through Prisma
WebSocket Server

The WebSocket server handles real-time communication between users inside a room.

It is responsible for:

Creating rooms
Joining rooms
Leaving rooms
Synchronizing video state
Broadcasting playback actions
Managing room participants
Managing roles
Removing participants
Room Class

Each active room maintains its room-specific state.

The room contains information such as:

Room ID
Host
Participants
Moderators
Current video
RoomManager Class

RoomManager manages the collection of active rooms.

Its responsibility includes creating and maintaining room instances and mapping users to their corresponding rooms.

Authentication

Authentication is handled using JWT.

After successful login, the JWT is stored in the browser's localStorage.

The token is used to authenticate the user when communicating with the application.

The HTTP backend and WebSocket server both use the JWT secret for token verification.

Role-Based Access Control

Each room contains users with different roles.

Host

The room creator automatically becomes the Host.

The Host has full control over the room, including:

Play video
Pause video
Seek video
Change video
Assign roles
Remove participants
Moderator

A Moderator can control playback operations such as:

Play
Pause
Seek
Change video

The Moderator role is assigned by the Host.

Participant

A user joining a room is assigned the Participant role by default.

Participants can watch the synchronized video but do not have playback control.

WebSocket Events

The application uses WebSockets for bidirectional real-time communication between clients and the server.

Client → Server
Event	Payload	Description
create_room	{ roomId, username }	Creates a new room
join_room	{ roomId, username }	Joins an existing room
leave_room	{ roomId }	Leaves a room
play	{}	Requests playback
pause	{}	Requests pause
seek	{ time }	Requests a change in playback position
change_video	{ videoId }	Changes the current YouTube video
assign_role	{ userId, role }	Assigns a role to a participant
remove_participant	{ userId }	Removes a participant
Server → Client
Event	Payload	Description
sync_state	{ playState, currentTime, videoId }	Synchronizes the current video state
user_joined	{ username, userId, role, participants }	Notifies the room about a new participant
user_left	{ username, userId, participants }	Notifies the room that a participant left
role_assigned	{ userId, username, role, participants }	Broadcasts a role update
participant_removed	{ userId, participants }	Broadcasts participant removal

Playback Synchronization

The YouTube player state is synchronized using WebSockets.

When an authorized user performs a playback action:

User Action
    │
    ▼
Frontend
    │
    │ WebSocket Event
    ▼
WebSocket Server
    │
    │ Validate permissions
    ▼
Room State
    │
    │ Broadcast update
    ▼
Other Participants
    │
    ▼
YouTube Player

For example, when the Host pauses the video:

Host
  │
  │ pause
  ▼
WebSocket Server
  │
  │ broadcast
  ▼
All Participants
  │
  ▼
Video pauses

The same mechanism is used for play, seek, and changing the current video.

Permission Enforcement

Role permissions are enforced on the backend.

For example, playback-related events are only processed when the connected user has the required role.

This prevents a restricted participant from gaining control simply by manually sending a WebSocket event.

The assignment specifically requires backend validation of permissions before processing events.

Database

The application uses PostgreSQL hosted on Neon.

The architecture contains the following logical tables:

Users

Stores application users.

Users
----------------
id
username
Rooms

Stores room information and room participants/roles.

Rooms
----------------
id
roomId
host
participants
moderator
Chat

The architecture includes a Chat table for room-related chat data.

Chat
----------------
id
username
roomId
Environment Variables
Frontend

The frontend requires environment variables for:

Backend/server URL
WebSocket server URL

Since the frontend is built with Vite, these values are provided through Vite environment variables.

Example:

<FRONTEND_SERVER_URL_VARIABLE>=<backend-url>
<FRONTEND_SOCKET_URL_VARIABLE>=<websocket-url>
HTTP Backend

The Express backend requires:

PORT=<port>
JWT_SECRET=<jwt-secret>
DATABASE_URL=<postgresql-database-url>
WebSocket Server

The WebSocket server requires:

PORT=<port>
JWT_SECRET=<jwt-secret>
DATABASE_URL=<postgresql-database-url>

Do not commit .env files or secret values to the repository.

Running Locally
1. Clone the repository
git clone <repository-url>
cd <project-directory>
2. Install dependencies

Install dependencies separately for the frontend, HTTP backend, and WebSocket server.

cd frontend
npm install
cd backend
npm install
cd ws-server
npm install
3. Configure environment variables

Create the required .env files for:

Frontend
HTTP backend
WebSocket server

Add the required server URLs, database URL, and JWT secret.

4. Start the frontend
npm run dev
5. Start the HTTP backend
npm run dev
6. Start the WebSocket server
npm run dev

The exact commands may depend on the scripts defined in each package.json.