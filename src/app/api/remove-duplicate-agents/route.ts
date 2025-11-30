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
        
        // Find duplicate members (same user_id appearing multiple times)
        const memberCounts = new Map();
        const duplicateMembers = [];
        
        callInfo.members.forEach(member => {
            const count = memberCounts.get(member.user_id) || 0;
            memberCounts.set(member.user_id, count + 1);
            
            if (count > 0) {
                duplicateMembers.push(member);
            }
        });
        
        if (duplicateMembers.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: "No duplicate agents found",
                members: callInfo.members.map(m => ({ id: m.user_id, name: m.user?.name }))
            });
        }
        
        console.log("Found duplicate members:", duplicateMembers.map(m => ({ id: m.user_id, name: m.user?.name })));
        
        // Remove duplicate members
        const membersToRemove = duplicateMembers.map(member => member.user_id);
        
        await call.updateCallMembers({
            remove_members: membersToRemove
        });
        
        console.log("✅ Removed duplicate agents:", membersToRemove);
        
        // Get updated member list
        const updatedCallInfo = await call.get();
        
        return NextResponse.json({ 
            success: true, 
            message: `Removed ${duplicateMembers.length} duplicate agents`,
            removedMembers: duplicateMembers.map(m => ({ id: m.user_id, name: m.user?.name })),
            currentMembers: updatedCallInfo.members.map(m => ({ id: m.user_id, name: m.user?.name }))
        });

    } catch (error) {
        console.error("❌ Failed to remove duplicate agents:", error);
        return NextResponse.json({ 
            error: `Failed to remove duplicates: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}