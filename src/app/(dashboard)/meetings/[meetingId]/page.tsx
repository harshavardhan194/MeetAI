import { MeetingDetailPageClient } from "./page-client";

interface PageProps {
    params: Promise<{
        meetingId: string;
    }>;
}

const Page = async ({ params }: PageProps) => {
    const { meetingId } = await params;
    
    return <MeetingDetailPageClient meetingId={meetingId} />;
}; 

export default Page;