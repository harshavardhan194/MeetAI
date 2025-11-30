import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        console.log("📊 Fetching meeting data for:", meetingId);

        // Get the call from Stream Video
        const call = streamVideo.call("default", meetingId);
        
        try {
            const callInfo = await call.get();
            console.log("Call info:", {
                recording: callInfo.call.recording,
                transcribing: callInfo.call.transcribing,
                custom: callInfo.call.custom
            });

            // Try to get recordings list
            const recordings = await call.listRecordings();
            console.log("Recordings:", recordings);

            // Try to get transcriptions list  
            const transcriptions = await call.listTranscriptions();
            console.log("Transcriptions:", transcriptions);

            // Also check if recording/transcription is currently active
            if (callInfo.call.recording) {
                console.log("📹 Recording is currently active");
            }
            if (callInfo.call.transcribing) {
                console.log("🎙️ Transcription is currently active");
            }

            // Update database with any found URLs
            const updateData: any = {};
            
            if (recordings.recordings && recordings.recordings.length > 0) {
                const latestRecording = recordings.recordings[0];
                if (latestRecording.url) {
                    updateData.recordingUrl = latestRecording.url;
                    console.log("📹 Found recording URL:", latestRecording.url);
                }
            }

            if (transcriptions.transcriptions && transcriptions.transcriptions.length > 0) {
                const latestTranscription = transcriptions.transcriptions[0];
                if (latestTranscription.url) {
                    updateData.transcriptUrl = latestTranscription.url;
                    console.log("📝 Found transcript URL:", latestTranscription.url);
                }
            }

            if (Object.keys(updateData).length > 0) {
                await db.update(meetings).set(updateData).where(eq(meetings.id, meetingId));
                console.log("✅ Updated meeting with fetched data");
            }

            return NextResponse.json({ 
                success: true, 
                message: "Meeting data fetched and updated",
                data: {
                    recordingUrl: updateData.recordingUrl || null,
                    transcriptUrl: updateData.transcriptUrl || null,
                    recordingsCount: recordings.recordings?.length || 0,
                    transcriptionsCount: transcriptions.transcriptions?.length || 0
                }
            });

        } catch (callError) {
            console.error("❌ Failed to get call info:", callError);
            return NextResponse.json({ 
                error: "Failed to fetch call data",
                details: callError instanceof Error ? callError.message : 'Unknown error'
            }, { status: 500 });
        }

    } catch (error) {
        console.error("❌ Failed to fetch meeting data:", error);
        return NextResponse.json({ 
            error: `Failed to fetch meeting data: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}