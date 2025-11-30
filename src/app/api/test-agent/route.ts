import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamClient, streamVideo } from "@/lib/stream-video";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        console.log("Test: Adding agent to meeting:", meetingId);

        // Find the meeting and agent
        const [existingMeeting] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, meetingId));

        if (!existingMeeting) {
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        const [existingAgent] = await db
            .select()
            .from(agents)
            .where(eq(agents.id, existingMeeting.agentId));

        if (!existingAgent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        console.log("Found meeting:", existingMeeting.name);
        console.log("Found agent:", existingAgent.name);

        // Add agent to Stream Video call
        const call = streamVideo.call("default", meetingId);

        // First, ensure the agent user exists in Stream
        console.log("Upserting agent user in Stream...");
        await streamClient.upsertUsers([
            {
                id: existingAgent.id,
                name: existingAgent.name,
                role: "user",
            }
        ]);

        // Get or create the call first with proper created_by
        console.log("Getting/creating call...");
        await call.getOrCreate({
            data: {
                created_by_id: existingMeeting.userId,
            }
        });

        // Add the agent as a call member
        console.log("Adding agent as call member...");
        const updateResult = await call.updateCallMembers({
            update_members: [
                {
                    user_id: existingAgent.id,
                    role: "user"
                }
            ]
        });
        
        console.log("Update members result:", updateResult);

        console.log(`✅ Test: Agent ${existingAgent.name} successfully added to meeting ${meetingId}`);

        return NextResponse.json({ 
            success: true, 
            message: `Agent ${existingAgent.name} added to meeting ${existingMeeting.name}` 
        });

    } catch (error) {
        console.error("❌ Test: Failed to add agent:", error);
        return NextResponse.json({ 
            error: `Failed to add agent: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}