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

        console.log("🔍 Debug: Checking agent join process for meeting:", meetingId);

        // Find the meeting and agent
        const [existingMeeting] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, meetingId));

        if (!existingMeeting) {
            console.log("❌ Meeting not found");
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        console.log("✅ Found meeting:", existingMeeting.name);

        const [existingAgent] = await db
            .select()
            .from(agents)
            .where(eq(agents.id, existingMeeting.agentId));

        if (!existingAgent) {
            console.log("❌ Agent not found");
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        console.log("✅ Found agent:", existingAgent.name);

        // Step 1: Create/update user in Stream
        console.log("1️⃣ Creating/updating agent user in Stream...");
        await streamClient.upsertUsers([
            { id: existingAgent.id, name: existingAgent.name },
        ]);
        console.log("✅ Agent user created/updated in Stream");

        // Step 2: Get the call
        console.log("2️⃣ Getting call...");
        const call = streamVideo.call("default", meetingId);
        console.log("✅ Call object created");

        // Step 3: Ensure call exists
        console.log("3️⃣ Ensuring call exists...");
        const callData = await call.getOrCreate({
            data: { created_by_id: existingMeeting.userId },
        });
        console.log("✅ Call exists, ID:", callData.call.id);

        // Step 4: Check current call members
        console.log("4️⃣ Checking current call members...");
        const callInfo = await call.get();
        console.log("Current members:", callInfo.members.map(m => ({ id: m.user_id, name: m.user?.name })));
        
        const existingMember = callInfo.members.find(member => member.user_id === existingAgent.id);
        if (existingMember) {
            console.log("⚠️ Agent is already a member of this call");
            return NextResponse.json({ 
                success: true, 
                message: "Agent is already in the call",
                currentMembers: callInfo.members.map(m => ({ id: m.user_id, name: m.user?.name }))
            });
        }

        // Step 5: Add agent as member
        console.log("5️⃣ Adding agent as call member...");
        const updateResult = await call.updateCallMembers({
            update_members: [{ user_id: existingAgent.id }],
        });
        console.log("✅ Agent added as member, result:", updateResult);

        // Step 6: Check members again
        console.log("6️⃣ Checking members after adding agent...");
        const updatedCallInfo = await call.get();
        console.log("Updated members:", updatedCallInfo.members.map(m => ({ id: m.user_id, name: m.user?.name })));

        // Step 7: Generate token for agent
        console.log("7️⃣ Generating token for agent...");
        const agentToken = streamClient.generateUserToken({
            user_id: existingAgent.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000) - 60,
        });
        console.log("✅ Agent token generated");

        console.log("🎉 Debug complete - Agent should now be visible in the call");

        return NextResponse.json({ 
            success: true, 
            message: `Debug complete for agent ${existingAgent.name}`,
            agentId: existingAgent.id,
            meetingId: meetingId,
            membersAfterAdd: updatedCallInfo.members.map(m => ({ id: m.user_id, name: m.user?.name }))
        });

    } catch (error) {
        console.error("❌ Debug failed:", error);
        return NextResponse.json({ 
            error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}