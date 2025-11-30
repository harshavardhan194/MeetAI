"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import NewMeetingDialog from "./new-meeting-dialog";
import { StatusFilter } from "./status-filter";
import { AgentIdFilter } from "./agent-id-filter";
import { MeetingsSearchFilters } from "./meetings-search-filters";

const MeetingsListHeader = () => {
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    return (
        <>
            <NewMeetingDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
            <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <div className="flex items-center justify-between">
                    <h5 className="font-medium text-xl">My Meetings</h5>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <PlusIcon />
                        New Meeting
                    </Button>
                </div>
                <div className="flex items-center gap-x-2 flex-wrap">
                    <MeetingsSearchFilters />
                    <AgentIdFilter />
                    <StatusFilter />
                </div>
            </div>
        </>
    );
};

export default MeetingsListHeader;