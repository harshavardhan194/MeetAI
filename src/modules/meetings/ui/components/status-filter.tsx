import {
    CircleXIcon,
    CircleCheckIcon,
    ClockArrowUpIcon,
    VideoIcon,
    LoaderIcon,
} from "lucide-react";
import { CommandSelect } from "@/components/command-select";
import { MeetingStatus } from "../../types";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";

const options = [
    {
        id: "all",
        value: "all",
        children: <span>All Statuses</span>
    },
    {
        id: MeetingStatus.Upcoming,
        value: MeetingStatus.Upcoming,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <ClockArrowUpIcon className="size-4" />
                <span>{MeetingStatus.Upcoming}</span>
            </div>
        )
    },
    {
        id: MeetingStatus.Completed,
        value: MeetingStatus.Completed,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <CircleCheckIcon className="size-4" />
                <span>{MeetingStatus.Completed}</span>
            </div>
        )
    },
    {
        id: MeetingStatus.Active,
        value: MeetingStatus.Active,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <VideoIcon className="size-4" />
                <span>{MeetingStatus.Active}</span>
            </div>
        )
    },
    {
        id: MeetingStatus.Processing,
        value: MeetingStatus.Processing,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <LoaderIcon className="size-4" />
                <span>{MeetingStatus.Processing}</span>
            </div>
        )
    },
    {
        id: MeetingStatus.Cancelled,
        value: MeetingStatus.Cancelled,
        children: (
            <div className="flex items-center gap-x-2 capitalize">
                <CircleXIcon className="size-4" />
                <span>{MeetingStatus.Cancelled}</span>
            </div>
        )
    },
];

export const StatusFilter = () => {
    const [filters, setFilters] = useMeetingsFilters();
    return (
        <CommandSelect
            placeholder="Status" className="h-9" options={options}
            onSelect={(value) => setFilters({ status: value === "all" ? undefined : value as MeetingStatus })}
            value={filters.status ?? ""}
            emptyAction={{
                label: "Clear Filter",
                onClick: () => setFilters({ status: undefined })
            }}
        />
    );
}