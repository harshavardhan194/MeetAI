This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# MeetAI 🤖💬

AI-powered video meeting platform enabling users to create custom AI agents that autonomously join and participate in video calls.

## ✨ Features

- **Custom AI Agents** - Create personalized AI agents with specific instructions
- **Real-time Video Meetings** - High-quality video calls with WebRTC
- **AI Agent Participation** - Agents join calls automatically and interact in real-time
- **Automatic Transcription** - AI-powered speech-to-text for all meetings
- **Meeting Recordings** - Automatic recording with cloud storage
- **AI Summaries** - Intelligent meeting summaries generated post-call
- **OAuth Authentication** - Secure login with GitHub and Google
- **Meeting Management** - Complete lifecycle tracking (upcoming, active, completed)

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- TanStack Query

**Backend:**
- tRPC (Type-safe APIs)
- Drizzle ORM
- PostgreSQL (Neon)
- Better Auth

**AI & Video:**
- OpenAI API
- Stream Video SDK
- WebRTC
- Inngest (Background jobs)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Stream Video API key
- GitHub/Google OAuth credentials

### Installation

1. Clone the repository
```bash
git clone https://github.com/harshavardhan194/meetai.git
cd meetai 
```
2. Install dependencies
```bash
npm install
```
3. Set up environment variables
```bash
cp .env.example .env
```
Fill in your credentials:

DATABASE_URL - PostgreSQL connection string
OPENAI_API_KEY - OpenAI API key
NEXT_PUBLIC_STREAM_VIDEO_API_KEY - Stream API key
STREAM_VIDEO_SECRET_KEY - Stream secret
GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET
BETTER_AUTH_SECRET - Random secret string

4. Push database schema
```bash
npm run db:push
```

5. Run development server
```bash
npm run dev
```

Open http://localhost:3000

📁 Project Structure

```bash
src/
├── app/              # Next.js App Router
├── components/       # Reusable UI components
├── db/              # Database schema & config
├── lib/             # Utility functions
├── modules/         # Feature modules
│   ├── agents/      # AI agent management
│   ├── auth/        # Authentication
│   ├── call/        # Video call interface
│   ├── dashboard/   # Dashboard UI
│   └── meetings/    # Meeting management
└── trpc/            # tRPC API routes
```

🔑 Key Features Explained

**AI Agent Architecture**
- Agents are created with custom instructions
- Automatically join meetings when sessions start
- Use OpenAI's real-time API for voice interactions
- Persist across multiple meetings

**Webhook-Driven Processing**
- Event-driven architecture for async operations
- Automatic transcription and recording processing
- Real-time status updates without polling

**Type-Safe Full Stack**
- End-to-end TypeScript with tRPC
- Zero runtime type errors
- Automatic API contract validation

**📝 License**
MIT

**👤 Author**
Harshavardhan Patil

GitHub: @harshavardhan194
🙏 Acknowledgments
Next.js
OpenAI
Stream
Neon


---

**GitHub Topics (add these tags):**
nextjs, typescript, ai, openai, video-chat, webrtc, trpc, postgresql, react, tailwindcss, meeting-platform, transcription, ai-agents
