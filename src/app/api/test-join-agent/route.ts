import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamClient, streamVideo } from "@/lib/stream-video";
import { createRealtimeClient } from "@stream-io/openai-realtime-api";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        console.log("🧪 Manual test: Adding agent to meeting:", meetingId);

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

        // Create/update user in Stream
        console.log("1. Creating/updating agent user in Stream...");
        await streamClient.upsertUsers([
            { id: existingAgent.id, name: existingAgent.name },
        ]);

        // Get the call
        console.log("2. Getting call...");
        const call = streamVideo.call("default", meetingId);

        // Ensure call exists
        console.log("3. Ensuring call exists...");
        await call.getOrCreate({
            data: { created_by_id: existingMeeting.userId },
        });

        // Check if agent is already in the call
        console.log("4. Checking if agent is already in call...");
        const callInfo = await call.get();
        const existingMember = callInfo.members.find(member => member.user_id === existingAgent.id);
        
        if (existingMember) {
            console.log("⚠️ Agent is already a member of this call");
            return NextResponse.json({ 
                success: true, 
                message: `Agent ${existingAgent.name} is already in the call`,
                alreadyJoined: true
            });
        }

        // Add agent as member
        console.log("5. Adding agent as call member...");
        await call.updateCallMembers({
            update_members: [{ user_id: existingAgent.id }],
        });

        // Generate token for agent
        console.log("6. Generating token for agent...");
        const agentToken = streamClient.generateUserToken({
            user_id: existingAgent.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000) - 60,
        });

        // Use Stream's connectOpenAi method to properly connect the agent
        console.log("7. Using Stream's connectOpenAi method...");
        try {
            const openAiConnection = await streamVideo.connectOpenAi({
                call,
                openAiApiKey: process.env.OPENAI_API_KEY!,
                agentUserId: existingAgent.id,
            });
            
            console.log("✅ OpenAI connected via Stream's connectOpenAi method");
            
            // Configure the session with more detailed settings
            await openAiConnection.updateSession({
                instructions: `You are ${existingAgent.name}, an AI assistant in a video call. 
                
                IMPORTANT BEHAVIOR:
                - Introduce yourself immediately when you join: "Hello! I'm ${existingAgent.name}, your AI assistant. I'm here to help with any questions you have."
                - Listen actively to what participants say and respond appropriately
                - Be conversational, helpful, and engaging
                - Keep responses concise and natural for voice conversation
                - Ask follow-up questions to keep the conversation going
                - If someone asks you a question, answer it directly and clearly
                
                You can see and hear all participants in the call. Respond to their questions and engage in natural conversation.`,
                voice: "alloy",
                modalities: ["text", "audio"],
                temperature: 0.8,
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500,
                },
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                }
            });
            
            console.log("✅ OpenAI session configured with enhanced settings");
            
            // Send an initial message to start the conversation
            console.log("📢 Sending initial greeting...");
            await openAiConnection.sendUserMessageContent([
                {
                    type: "input_text",
                    text: "Please introduce yourself to the participants in the call."
                }
            ]);
            
            console.log("✅ Initial greeting sent");
            
        } catch (connectError) {
            console.log("⚠️ Stream connectOpenAi failed, trying alternative method:", connectError);
            
            // Fallback to direct OpenAI connection
            console.log("8. Fallback: Direct OpenAI connection...");
            const openAiClient = createRealtimeClient({
                baseUrl: "https://video.stream-io-api.com",
                call: {
                    type: "default",
                    id: meetingId,
                },
                streamApiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
                streamUserToken: agentToken,
                openAiApiKey: process.env.OPENAI_API_KEY!,
                debug: true,
            });

            openAiClient.updateSession({
                instructions: `You are ${existingAgent.name}, an AI assistant in a video call. 
                
                IMPORTANT BEHAVIOR:
                - Introduce yourself immediately: "Hello! I'm ${existingAgent.name}, your AI assistant."
                - Listen actively and respond to what participants say
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
        }

        // Wait for connections to establish
        console.log("9. Waiting for connections to establish...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`✅ Test: Agent ${existingAgent.name} successfully added to meeting ${meetingId}`);

        return NextResponse.json({ 
            success: true, 
            message: `Agent ${existingAgent.name} added to meeting ${existingMeeting.name}`,
            agentId: existingAgent.id,
            meetingId: meetingId
        });

    } catch (error) {
        console.error("❌ Test: Failed to add agent:", error);
        return NextResponse.json({ 
            error: `Failed to add agent: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}