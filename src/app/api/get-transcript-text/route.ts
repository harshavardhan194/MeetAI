import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        // Get the meeting with transcript URL
        const [meeting] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, meetingId));

        if (!meeting) {
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        if (!meeting.transcriptUrl) {
            return NextResponse.json({ error: "No transcript available" }, { status: 404 });
        }

        console.log("Fetching transcript from:", meeting.transcriptUrl);

        // Fetch the transcript JSON from the URL
        const transcriptResponse = await fetch(meeting.transcriptUrl);
        
        if (!transcriptResponse.ok) {
            return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 500 });
        }

        const transcriptData = await transcriptResponse.json();
        console.log("Transcript data structure:", Object.keys(transcriptData));

        // Parse the transcript JSON and convert to plain text
        let plainText = "";
        
        if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
            // Format: { transcript: [{ text: "...", speaker: "...", timestamp: "..." }] }
            plainText = transcriptData.transcript
                .map((item: any) => {
                    const speaker = item.speaker || item.user_name || "Unknown";
                    const text = item.text || item.message || "";
                    const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "";
                    
                    if (timestamp) {
                        return `[${timestamp}] ${speaker}: ${text}`;
                    } else {
                        return `${speaker}: ${text}`;
                    }
                })
                .join("\n");
        } else if (Array.isArray(transcriptData)) {
            // Format: [{ text: "...", speaker: "..." }]
            plainText = transcriptData
                .map((item: any) => {
                    const speaker = item.speaker || item.user_name || "Unknown";
                    const text = item.text || item.message || "";
                    return `${speaker}: ${text}`;
                })
                .join("\n");
        } else if (transcriptData.messages && Array.isArray(transcriptData.messages)) {
            // Format: { messages: [{ content: "...", role: "..." }] }
            plainText = transcriptData.messages
                .map((item: any) => {
                    const speaker = item.role || item.speaker || "Unknown";
                    const text = item.content || item.text || "";
                    return `${speaker}: ${text}`;
                })
                .join("\n");
        } else {
            // Fallback: try to extract any text content
            const jsonString = JSON.stringify(transcriptData, null, 2);
            plainText = jsonString;
        }

        if (!plainText.trim()) {
            return NextResponse.json({ error: "No text content found in transcript" }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true,
            plainText: plainText.trim(),
            originalData: transcriptData // Include original for debugging
        });

    } catch (error) {
        console.error("❌ Failed to get transcript text:", error);
        return NextResponse.json({ 
            error: `Failed to get transcript: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}