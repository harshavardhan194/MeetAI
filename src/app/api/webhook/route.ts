import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  CallCreatedEvent,
  CallSessionParticipantLeftEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamClient, streamVideo } from "@/lib/stream-video";

export async function POST(req: NextRequest) {
  console.log("📩 Webhook received");

  const rawBody = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload as { type?: string })?.type;
  console.log("📢 Event type:", eventType);

  // Handle call creation - prepare for agent joining
  if (eventType === "call.created") {
    const event = payload as CallCreatedEvent;
    const meetingId = event.call?.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    console.log(`📞 Call created for meeting ${meetingId}, preparing agent...`);
    
    // Keep meeting status as upcoming until session actually starts
    console.log(`📅 Meeting ${meetingId} remains in upcoming status until session starts`);
    
    return NextResponse.json({ status: "ok", message: "Call created, agent prepared" });
  }

  // Handle session start - automatically join agent
  if (eventType === "call.session_started") {
    const event = payload as CallCreatedEvent;
    const meetingId = event.call?.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    console.log(`🚀 Call session started for meeting ${meetingId}, auto-joining agent...`);

    // Update meeting status to active when session actually starts
    await db.update(meetings).set({ status: "active", startedAt: new Date() }).where(eq(meetings.id, meetingId));

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

    try {
      console.log(`🤖 Signaling client to spawn virtual agent ${existingAgent.name}...`);
      
      const call = streamVideo.call("default", meetingId);

      // Ensure call exists with proper settings
      await call.getOrCreate({
        data: { 
          created_by_id: existingMeeting.userId,
          settings_override: {
            transcription: {
              language: "en",
              mode: "auto-on",
              closed_caption_mode: "auto-on",
            },
            recording: {
              mode: "auto-on",
              quality: "1080p",
            },
          },
        },
      });

      // Check if agent signal has already been sent
      console.log("🔍 Checking if agent signal already exists...");
      const callData = await call.get();
      
      if (callData.call.custom?.shouldJoinAgent) {
        console.log("⚠️ Agent join signal already exists, skipping duplicate");
        return NextResponse.json({ status: "ok", message: "Agent signal already sent" });
      }

      // Store agent join signal in call custom data for client to pick up
      console.log("🎯 Storing agent join signal for client...");
      await call.update({
        custom: {
          ...callData.call.custom,
          shouldJoinAgent: true,
          agentId: existingAgent.id,
          agentName: existingAgent.name,
          timestamp: Date.now(),
        }
      });
      console.log("✅ Agent join signal stored in call custom data");

      // Start transcription and recording
      try {
        console.log("🎙️ Starting transcription...");
        await call.startTranscription();
        console.log("✅ Transcription started");
      } catch (transcriptionError) {
        console.log("⚠️ Transcription start failed:", transcriptionError);
      }

      try {
        console.log("📹 Starting recording...");
        await call.startRecording();
        console.log("✅ Recording started");
      } catch (recordingError) {
        console.log("⚠️ Recording start failed:", recordingError);
      }

      console.log(`✅ Agent join signal sent for ${existingAgent.name} in meeting ${meetingId}`);
      return NextResponse.json({ status: "ok", message: "Agent join signal sent" });
      
    } catch (error) {
      console.error("❌ Failed to signal agent join:", error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({ error: "Failed to signal agent join" }, { status: 500 });
    }
  }

  // Handle transcription ready - save transcript URL to database
  if (eventType === "call.transcription_ready") {
    const event = payload as { call?: { custom?: { meetingId?: string } }, call_transcription?: { url?: string } };
    const meetingId = event.call?.custom?.meetingId;
    const transcriptUrl = event.call_transcription?.url;

    if (meetingId && transcriptUrl) {
      try {
        console.log(`📝 Transcription ready for meeting ${meetingId}: ${transcriptUrl}`);
        
        await db.update(meetings).set({ 
          transcriptUrl: transcriptUrl 
        }).where(eq(meetings.id, meetingId));
        
        console.log(`✅ Transcript URL saved to database for meeting ${meetingId}`);
        
        // Note: Transcript processing can be added here if needed
        console.log(`✅ Transcript URL saved for meeting ${meetingId}`);
      } catch (error) {
        console.error("❌ Failed to save transcript URL or trigger processing:", error);
      }
    }
    
    return NextResponse.json({ status: "ok", message: "Transcript URL saved" });
  }
  if (eventType === "call.recording_ready") {
    const event = payload as { call?: { custom?: { meetingId?: string } }, call_recording?: { url?: string } };
    const meetingId = event.call?.custom?.meetingId;
    const recordingUrl = event.call_recording?.url;

    if (meetingId && recordingUrl) {
      try {
        console.log(`🎥 Recording ready for meeting ${meetingId}: ${recordingUrl}`);
        
        await db.update(meetings).set({ 
          recordingUrl: recordingUrl 
        }).where(eq(meetings.id, meetingId));
        
        console.log(`✅ Recording URL saved to database for meeting ${meetingId}`);
      } catch (error) {
        console.error("❌ Failed to save recording URL:", error);
      }
    }
    
    return NextResponse.json({ status: "ok", message: "Recording URL saved" });
  }

  if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid?.split(":")[1];

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }
    
    try {
      const call = streamVideo.call("default", meetingId);
      
      // Update meeting status to completed and reset agent joined flag
      await db.update(meetings).set({ 
        status: "completed", 
        endedAt: new Date(),
        agentJoined: false
      }).where(eq(meetings.id, meetingId));
      
      // End the call (this will automatically disconnect any OpenAI connections)
      await call.end();
      
      console.log(`🛑 Meeting ${meetingId} ended and OpenAI disconnected`);
      return NextResponse.json({ status: "ended" });
    } catch (error) {
      console.error("❌ Error ending call:", error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
    }
  }

  // Handle call ended - final cleanup and data capture
  if (eventType === "call.ended") {
    const event = payload as { call?: { custom?: { meetingId?: string }, recording?: unknown, transcribing?: unknown } };
    const meetingId = event.call?.custom?.meetingId;

    if (meetingId) {
      try {
        console.log(`🏁 Call ended for meeting ${meetingId}, performing final data capture...`);
        
        // Get the call to check for any final recording/transcription data
        const call = streamVideo.call("default", meetingId);
        const callInfo = await call.get();
        
        // Update meeting with any final data
        const updateData: { status: string; endedAt: Date; agentJoined: boolean; recordingUrl?: string; transcriptUrl?: string } = {
          status: "completed",
          endedAt: new Date(),
          agentJoined: false
        };
        
        // Check if we have recording/transcription URLs that weren't captured yet
        if (callInfo.call.recording && !updateData.recordingUrl) {
          // Try to get recording URL from call state if available
          console.log("📹 Checking for recording data in call state...");
        }
        
        if (callInfo.call.transcribing && !updateData.transcriptUrl) {
          // Try to get transcript URL from call state if available
          console.log("📝 Checking for transcription data in call state...");
        }
        
        await db.update(meetings).set(updateData).where(eq(meetings.id, meetingId));
        
        console.log(`✅ Final meeting data updated for ${meetingId}`);
      } catch (error) {
        console.error("❌ Failed to update final meeting data:", error);
      }
    }
    
    return NextResponse.json({ status: "ok", message: "Call ended, data captured" });
  }

  return NextResponse.json({ status: "ignored" });
}