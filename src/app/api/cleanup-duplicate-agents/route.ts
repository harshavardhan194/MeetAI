import { NextRequest, NextResponse } from "next/server";
import { streamVideo } from "@/lib/stream-video";

export async function POST(req: NextRequest) {
    try {
        const { meetingId } = await req.json();
        
        if (!meetingId) {
            return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
        }

        console.log("🧹 Cleaning up duplicate agents in meeting:", meetingId);

        const call = streamVideo.call("default", meetingId);
        const callInfo = await call.get();
        
        console.log("Current members:", callInfo.members.map(m => ({ id: m.user_id, name: m.user?.name })));
        
        // Find agent members (those with agent IDs or virtual- prefix)
        const agentMembers = callInfo.members.filter(member => 
            member.user_id.startsWith('virtual-') || 
            member.user_id.includes('yQ7ctTNZ3kKgm-tnZpxgw') || // Your specific agent ID
            member.user?.name?.includes('🤖') ||
            member.user?.name?.includes('Math tutor')
        );
        
        console.log("Found agent members:", agentMembers.map(m => ({ id: m.user_id, name: m.user?.name })));
        
        if (agentMembers.length <= 1) {
            return NextResponse.json({ 
                success: true, 
                message: "No duplicate agents found",
                agentCount: agentMembers.length,
                members: callInfo.members.map(m => ({ id: m.user_id, name: m.user?.name }))
            });
        }
        
        // Keep the most recent agent (last in the list) and remove others
        const agentsToRemove = agentMembers.slice(0, -1);
        const membersToRemove = agentsToRemove.map(member => member.user_id);
        
        console.log("Removing duplicate agents:", membersToRemove);
        
        await call.updateCallMembers({
            remove_members: membersToRemove
        });
        
        console.log("✅ Removed duplicate agents:", membersToRemove);
        
        // Get updated member list
        const updatedCallInfo = await call.get();
        
        return NextResponse.json({ 
            success: true, 
            message: `Removed ${agentsToRemove.length} duplicate agents`,
            removedAgents: agentsToRemove.map(m => ({ id: m.user_id, name: m.user?.name })),
            remainingMembers: updatedCallInfo.members.map(m => ({ id: m.user_id, name: m.user?.name }))
        });

    } catch (error) {
        console.error("❌ Failed to cleanup duplicate agents:", error);
        return NextResponse.json({ 
            error: `Failed to cleanup duplicates: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}