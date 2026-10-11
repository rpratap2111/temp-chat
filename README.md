# 🗨️ Temp Chat

Disposable, end-to-end encrypted chat rooms. Private while it lasts, gone when
it ends, and you keep only what the room agrees to pin.

🔗 **Live demo:** [https://temp-chat-app-lilac.vercel.app](https://temp-chat-app-lilac.vercel.app)

## Stack

- **backend/** – Node, Express, Socket.IO, Mongoose (MongoDB)
- **frontend/** – React 19, Vite, Tailwind CSS v4, socket.io-client, Web Crypto

## Running locally

Backend:

```bash
cd backend
cp .env.example .env   # then set MONGODB_URI
npm install
npm run dev
```

Frontend (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the backend URL from `VITE_API_URL` in
`frontend/.env.development` (local) and `frontend/.env.production` (build).
Override it per machine in a gitignored `frontend/.env.development.local`.

## Backend environment

| Variable      | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `MONGODB_URI` | MongoDB connection string                                            |
| `VITE_URL`    | Allowed browser origin(s) for CORS, comma-separated                  |
| `PORT`        | Port to listen on (defaults to 4000; hosts usually set this)         |
| `TRUST_PROXY` | Set to `1` behind a proxy such as Render so rate limits see real IPs |

On startup the server syncs MongoDB indexes to the schemas, which also removes
indexes the schemas no longer declare.

## How it works

**Creating and joining**

- The creator picks a lifetime (10 minutes to 24 hours), when else the room
  should close, and an optional password. The server generates an 8-character
  room code and returns a secret host token.
- The creator's browser generates a random AES-256 key. The invite link carries
  the code and the key after `#`, a part of the URL browsers never send to a
  server. A QR code of the link is available from the Invite button.
- Joining needs the full invite link, plus the password if the room has one.

**Encryption**

- Messages and files are encrypted in the browser with AES-GCM before they are
  sent. The server stores and relays only ciphertext. Usernames and system
  notices ("Ann joined") are not encrypted.
- Double-click a message, or use its reply button, to reply to it. The quoted
  preview is encrypted inside the reply, and clicking it jumps to the original.
- Files up to 2 MB are encrypted the same way. Only PNG, JPEG, GIF and WebP are
  shown inline; anything else is offered as a download.

**Who is the host**

- The host is whoever holds the host token, not whoever uses the creator's name.

**Staying connected**

- The session is kept in `sessionStorage`, so a refresh rejoins the same seat.
  A dropped connection keeps its seat for 20 seconds before the user counts as
  gone, so refreshes and brief network drops don't close rooms.

**Ending**

- A room closes when its timer runs out, when the host closes it, and, depending
  on the creator's choice, when the host leaves or when everyone has left.
- The host can extend the room, in 15- or 60-minute steps, up to 24 hours after
  creation. Everyone sees a live countdown.
- When a room closes, its document and all its messages are deleted. Anyone can
  pin messages during the chat; the closed screen shows the pinned messages and
  offers them as a text download. That copy exists only in the browser tab.
- Senders can make a message burn after 10 seconds, 1 minute or 5 minutes.

**Moderation**

- The host can remove or mute people, lock the room to newcomers, turn on slow
  mode, and delete any message. Everyone can delete their own messages.
- The server rate-limits messages, room creation, room lookups and failed
  password attempts.

## Known limits

- Rate limits and live room state are in memory, so the backend should run as a
  single instance.
- A removed user can rejoin from a fresh browser tab under a new name. Lock the
  room to stop that.
- Anyone holding the invite link can read the room, so share it with care.

## License

MIT License. Copyright (c) 2025 Rudra Pratap.

## Contact

Built with ❤️ by **Rudra Pratap**

- GitHub: [@rpratap2111](https://github.com/rpratap2111/)
- LinkedIn: [Rudra Pratap](https://www.linkedin.com/in/rudra-pratap-a34a6b275/)
