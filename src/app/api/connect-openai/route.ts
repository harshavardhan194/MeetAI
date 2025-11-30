import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { meetingId, agentId, agentName } = await req.json();
        
        if (!meetingId || !agentId || !agentName) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        console.log(`🎤 Connecting OpenAI for agent ${agentName} in meeting ${meetingId}...`);

        // Get the meeting to find the agent instructions
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

        const call = streamVideo.call("default", meetingId);

        try {
            // Connect OpenAI to the call
            const openAiConnection = await streamVideo.connectOpenAi({
                call,
                openAiApiKey: process.env.OPENAI_API_KEY!,
                agentUserId: agentId,
            });
            
            console.log("✅ OpenAI connected via Stream's connectOpenAi method");
            
            // Configure the session with agent instructions
            await openAiConnection.updateSession({
                instructions: `You are ${agentName}, an AI assistant in a video call. 
                
                Agent Instructions: ${existingAgent.instructions}
                
                IMPORTANT BEHAVIOR:
                - Introduce yourself immediately when you join: "Hello! I'm ${agentName}, your AI assistant. I'm here to help with any questions you have."
                - Listen actively to what participants say and respond appropriately
                - Be conversational, helpful, and engaging
                - Keep responses concise and natural for voice conversation
                - Ask follow-up questions to keep the conversation going
                - Follow the specific instructions provided for your role
                
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
            
            // Send an initial greeting
            await openAiConnection.sendUserMessageContent([
                {
                    type: "input_text",
                    text: "Please introduce yourself to the participants in the call and ask how you can help them today."
                }
            ]);
            
            console.log("✅ OpenAI session configured and greeting sent");
            
            return NextResponse.json({ 
                success: true, 
                message: "OpenAI connected successfully" 
            });
            
        } catch (openAiError) {
            console.error("❌ OpenAI connection failed:", openAiError);
            return NextResponse.json({ 
                error: `OpenAI connection failed: ${openAiError instanceof Error ? openAiError.message : 'Unknown error'}` 
            }, { status: 500 });
        }

    } catch (error) {
        console.error("❌ Failed to connect OpenAI:", error);
        return NextResponse.json({ 
            error: `Failed to connect OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}