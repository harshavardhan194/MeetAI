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

        console.log("🚀 Force spawning agent for meeting:", meetingId);

        // Get meeting and agent info
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

        // Create virtual agent ID
        const virtualAgentId = `virtual-${existingAgent.id}-${Date.now()}`;
        
        console.log("Creating virtual agent user:", virtualAgentId);
        
        // Create user in Stream
        await streamClient.upsertUsers([
            { 
                id: virtualAgentId, 
                name: `🤖 ${existingAgent.name}`,
                image: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
            },
        ]);

        // Generate token
        const agentToken = streamClient.generateUserToken({
            user_id: virtualAgentId,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000) - 60,
        });

        // Get the call and add agent as member
        const call = streamVideo.call("default", meetingId);
        
        await call.updateCallMembers({
            update_members: [{ user_id: virtualAgentId }],
        });

        console.log("Agent added as call member, now connecting OpenAI...");

        // Connect OpenAI
        try {
            const openAiConnection = await streamVideo.connectOpenAi({
                call,
                openAiApiKey: process.env.OPENAI_API_KEY!,
                agentUserId: virtualAgentId,
            });
            
            console.log("✅ OpenAI connected");
            
            // Configure the session
            await openAiConnection.updateSession({
                instructions: `You are ${existingAgent.name}, an AI assistant in a video call. 
                
                Agent Instructions: ${existingAgent.instructions}
                
                IMPORTANT BEHAVIOR:
                - Introduce yourself immediately: "Hello! I'm ${existingAgent.name}, your AI assistant. I'm here to help with any questions you have."
                - Listen actively and respond appropriately
                - Be conversational, helpful, and engaging
                - Keep responses concise and natural for voice conversation
                - Ask follow-up questions to keep the conversation going
                
                You can see and hear all participants in the call.`,
                voice: "alloy",
                modalities: ["text", "audio"],
                temperature: 0.8,
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500,
                },
            });
            
            // Send greeting
            await openAiConnection.sendUserMessageContent([
                {
                    type: "input_text",
                    text: "Please introduce yourself to the participants in the call and ask how you can help them today."
                }
            ]);
            
            console.log("✅ OpenAI session configured and greeting sent");
            
        } catch (openAiError) {
            console.error("❌ OpenAI connection failed:", openAiError);
        }

        // Start recording and transcription
        try {
            console.log("📹 Starting recording...");
            await call.startRecording();
            console.log("✅ Recording started");
        } catch (recordingError) {
            console.log("⚠️ Recording start failed:", recordingError);
        }

        try {
            console.log("🎙️ Starting transcription...");
            await call.startTranscription();
            console.log("✅ Transcription started");
        } catch (transcriptionError) {
            console.log("⚠️ Transcription start failed:", transcriptionError);
        }

        // Mark as joined in database
        await db.update(meetings).set({ agentJoined: true }).where(eq(meetings.id, meetingId));

        return NextResponse.json({ 
            success: true, 
            message: `AI agent ${existingAgent.name} spawned successfully`,
            agentId: virtualAgentId,
            agentName: existingAgent.name
        });

    } catch (error) {
        console.error("❌ Failed to force spawn agent:", error);
        return NextResponse.json({ 
            error: `Failed to spawn agent: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}