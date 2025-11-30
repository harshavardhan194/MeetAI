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

        console.log("🚀 Force Agent Join for meeting:", meetingId);

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

        console.log("Found agent:", existingAgent.name);

        // Create a unique agent ID for this session
        const sessionAgentId = `${existingAgent.id}-session-${Date.now()}`;
        
        // Create/update user in Stream with session ID
        console.log("1. Creating agent user with session ID...");
        await streamClient.upsertUsers([
            { 
                id: sessionAgentId, 
                name: `🤖 ${existingAgent.name}`,
                image: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png" // Robot icon
            },
        ]);

        // Get the call
        const call = streamVideo.call("default", meetingId);

        // Ensure call exists
        await call.getOrCreate({
            data: { created_by_id: existingMeeting.userId },
        });

        // Add agent as member with session ID
        console.log("2. Adding agent as call member...");
        await call.updateCallMembers({
            update_members: [{ user_id: sessionAgentId }],
        });

        // Generate token for the session agent
        console.log("3. Generating session token...");
        const agentToken = streamClient.generateUserToken({
            user_id: sessionAgentId,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000) - 60,
        });

        // Try to make the agent join the call session using Stream's REST API
        console.log("4. Making agent join call session...");
        try {
            const joinResponse = await fetch(`https://video.stream-io-api.com/video/call/default/${meetingId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${agentToken}`,
                    'Content-Type': 'application/json',
                    'Stream-Auth-Type': 'jwt',
                    'x-api-key': process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
                },
                body: JSON.stringify({
                    create: false,
                    api_key: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
                    data: {
                        user: {
                            id: sessionAgentId,
                            name: `🤖 ${existingAgent.name}`,
                        }
                    }
                })
            });

            if (joinResponse.ok) {
                const joinData = await joinResponse.json();
                console.log("✅ Agent successfully joined call session:", joinData);
                
                // Now try to connect OpenAI
                console.log("5. Connecting OpenAI...");
                try {
                    const openAiConnection = await streamVideo.connectOpenAi({
                        call,
                        openAiApiKey: process.env.OPENAI_API_KEY!,
                        agentUserId: sessionAgentId,
                    });
                    
                    await openAiConnection.updateSession({
                        instructions: `You are ${existingAgent.name}, an AI assistant. Introduce yourself immediately when you join the call.`,
                        voice: "alloy",
                        modalities: ["text", "audio"],
                        temperature: 0.8,
                    });
                    
                    console.log("✅ OpenAI connected and configured");
                } catch (openAiError) {
                    console.log("⚠️ OpenAI connection failed, but agent should still be visible:", openAiError);
                }
                
                return NextResponse.json({ 
                    success: true, 
                    message: `Agent ${existingAgent.name} joined the call session`,
                    agentId: sessionAgentId,
                    joinData: joinData
                });
            } else {
                const errorText = await joinResponse.text();
                console.log("⚠️ Agent join response:", joinResponse.status, errorText);
                
                return NextResponse.json({ 
                    success: false, 
                    message: `Agent added as member but couldn't join session: ${joinResponse.status}`,
                    agentId: sessionAgentId,
                    error: errorText
                });
            }
        } catch (joinError) {
            console.log("⚠️ Could not join call session directly:", joinError);
            
            return NextResponse.json({ 
                success: true, 
                message: `Agent ${existingAgent.name} added as member (session join failed)`,
                agentId: sessionAgentId,
                warning: "Could not join session directly"
            });
        }

    } catch (error) {
        console.error("❌ Force agent join failed:", error);
        return NextResponse.json({ 
            error: `Force agent join failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}