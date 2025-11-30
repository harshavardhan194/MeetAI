"use client";

import { MeetingDetailView } from "@/modules/meetings/ui/views/meeting-detail-view";
import { useRouter } from "next/navigation";

interface MeetingDetailPageClientProps {
    meetingId: string;
}

export const MeetingDetailPageClient = ({ meetingId }: MeetingDetailPageClientProps) => {
    const router = useRouter();
    
    return (
        <MeetingDetailView 
            meetingId={meetingId}
            onBack={() => router.push("/meetings")}
            onDelete={() => router.push("/meetings")}
        />
    );
};