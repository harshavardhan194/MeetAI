import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamClient, streamVideo } from "@/lib/stream-video";
import { eq, and } from "drizzle-orm";

// Global set to prevent concurrent spawning for the same meeting
const spawningMeetings = new Set<string>();

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        console.log("👻 Spawning agent for meeting:", meetingId);

        // Check if already spawning for this meeting
        if (spawningMeetings.has(meetingId)) {
            console.log("⚠️ Agent already spawning for meeting:", meetingId);
            return NextResponse.json({ error: "Agent already spawning" }, { status: 409 });
        }

        spawningMeetings.add(meetingId);
        console.log(`🔒 Locked spawning for meeting: ${meetingId}`);

        try {
            // First, atomically check and update the database to prevent race conditions
            const [existingMeeting] = await db
                .select()
                .from(meetings)
                .where(eq(meetings.id, meetingId));

            if (!existingMeeting) {
                spawningMeetings.delete(meetingId);
                return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
            }

            // Check if agent has already joined this meeting
            if (existingMeeting.agentJoined) {
                console.log("⚠️ Agent already joined this meeting in database");
                spawningMeetings.delete(meetingId);
                return NextResponse.json({ error: "Agent already joined" }, { status: 409 });
            }

            // Atomically mark agent as joined to prevent race conditions
            // Only update if agentJoined is currently false
            const updateResult = await db.update(meetings)
                .set({ agentJoined: true })
                .where(and(eq(meetings.id, meetingId), eq(meetings.agentJoined, false)))
                .returning();

            if (updateResult.length === 0) {
                console.log("⚠️ Agent already joined - atomic update failed");
                spawningMeetings.delete(meetingId);
                return NextResponse.json({ error: "Agent already joined" }, { status: 409 });
            }

            console.log(`✅ Successfully marked agent as joined for meeting: ${meetingId}`);

            // Double-check by looking at the call members
            const call = streamVideo.call("default", meetingId);
            const callInfo = await call.get();
            
            const existingVirtualAgent = callInfo.members.find(member => 
                member.user_id.startsWith('virtual-') || member.user_id.includes('agent')
            );
            
            if (existingVirtualAgent) {
                console.log("⚠️ Virtual agent already exists in call:", existingVirtualAgent.user_id);
                // Reset the database flag since we're not actually spawning
                await db.update(meetings).set({ agentJoined: false }).where(eq(meetings.id, meetingId));
                spawningMeetings.delete(meetingId);
                return NextResponse.json({ error: "Agent already in call" }, { status: 409 });
            }

            const [existingAgent] = await db
                .select()
                .from(agents)
                .where(eq(agents.id, existingMeeting.agentId));

            if (!existingAgent) {
                spawningMeetings.delete(meetingId);
                return NextResponse.json({ error: "Agent not found" }, { status: 404 });
            }

            console.log("Found agent:", existingAgent.name);

            // Create a unique agent ID for this session
            const virtualAgentId = `virtual-${existingAgent.id}-${Date.now()}`;
            
            // Create/update user in Stream
            console.log("1. Creating virtual agent user...");
            await streamClient.upsertUsers([
                { 
                    id: virtualAgentId, 
                    name: `🤖 ${existingAgent.name}`,
                    image: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
                },
            ]);

            // Generate token for the virtual agent
            console.log("2. Generating token for virtual agent...");
            const agentToken = streamClient.generateUserToken({
                user_id: virtualAgentId,
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000) - 60,
            });

            console.log("✅ Virtual agent spawned successfully");
            spawningMeetings.delete(meetingId);

            return NextResponse.json({ 
                success: true, 
                message: `Virtual agent ${existingAgent.name} spawned`,
                agentId: virtualAgentId,
                agentName: existingAgent.name,
                agentToken: agentToken,
                apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!
            });

        } catch (innerError) {
            spawningMeetings.delete(meetingId);
            throw innerError;
        }

    } catch (error) {
        spawningMeetings.delete(meetingId);
        console.error("❌ Failed to spawn agent:", error);
        return NextResponse.json({ 
            error: `Failed to spawn agent: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}