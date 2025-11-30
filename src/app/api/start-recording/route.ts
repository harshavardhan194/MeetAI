import { NextRequest, NextResponse } from "next/server";
import { streamVideo } from "@/lib/stream-video";

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        console.log("🎬 Starting recording and transcription for meeting:", meetingId);

        const call = streamVideo.call("default", meetingId);

        // Start transcription
        try {
            console.log("🎙️ Starting transcription...");
            await call.startTranscription();
            console.log("✅ Transcription started successfully");
        } catch (transcriptionError) {
            console.log("⚠️ Transcription failed:", transcriptionError);
        }

        // Start recording
        try {
            console.log("📹 Starting recording...");
            await call.startRecording();
            console.log("✅ Recording started successfully");
        } catch (recordingError) {
            console.log("⚠️ Recording failed:", recordingError);
        }

        // Get call info to check status
        const callInfo = await call.get();
        console.log("Call recording status:", callInfo.call.recording);
        console.log("Call transcription status:", callInfo.call.transcribing);

        return NextResponse.json({ 
            success: true, 
            message: "Recording and transcription started",
            recording: callInfo.call.recording,
            transcribing: callInfo.call.transcribing
        });

    } catch (error) {
        console.error("❌ Failed to start recording/transcription:", error);
        return NextResponse.json({ 
            error: `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}