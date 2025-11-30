"use client";

import GenerateAvatar from "@/components/generate-avatar";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import {
    CircleCheckIcon,
    CircleXIcon,
    ClockArrowUpIcon,
    ClockFadingIcon,
    CornerDownRightIcon,
    LoaderIcon,
    EditIcon,
    TrashIcon,
    MoreHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MeetingGetMany } from "../../types";
import { format } from "date-fns";
import humanizeDuration from "humanize-duration";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDuration(seconds: number) {
    return humanizeDuration(seconds * 1000, {
        largest: 1,
        round: true,
        units: ["h", "m", "s"],
    });
};
const statusIconMap = {
    upcoming: ClockArrowUpIcon,
    active: LoaderIcon,
    completed: CircleCheckIcon,
    processing: LoaderIcon,
    cancelled: CircleXIcon,
};
const statusColorMap = {
    upcoming: "bg-yellow-500/20 text-yellow-800 border-yellow-800/5",
    active: "bg-blue-500/20 text-blue-800 border-blue-800/5",
    completed: "bg-emerald-500/20 text-emerald-800 border-emerald-800/5",
    cancelled: "bg-rose-500/20 text-rose-800 border-rose-800/5",
    processing: "bg-gray-300/20 text-gray-800 border-gray-800/5",
};
interface MeetingActionsProps {
    onEdit?: (meeting: MeetingGetMany[number]) => void;
    onDelete?: (meeting: MeetingGetMany[number]) => void;
}

export const createMeetingColumns = ({ onEdit, onDelete }: MeetingActionsProps = {}): ColumnDef<MeetingGetMany[number]>[] => [
    {
        accessorKey: "name",
        header: "Meeting Name",
        cell: ({ row }) => (
            <div className="flex flex-col gap-y-1">
                <span className="font-semibold capitalize">{row.original.name}</span>
                <div className="flex items-center gap-x-2">
                    <div className="flex items-center gap-x-1">
                        <CornerDownRightIcon className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-sm max-w-[200px] truncate capitalize">
                            {row.original.agent.name}
                        </span>
                    </div>
                    <GenerateAvatar
                        variant="botttsNeutral"
                        seed={row.original.agent.name}
                        className="size-4"
                    />
                    <span className="text-sm text-muted-foreground">
                        {row.original.startedAt ? format(row.original.startedAt, "MMM d") : ""}
                    </span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "Status",
        header: "Status",
        cell: ({ row }) => {
            const Icon = statusIconMap[row.original.status as keyof typeof statusIconMap];
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "capitalize [&>svg]:size-4 text-muted-foreground",
                        statusColorMap[row.original.status as keyof typeof statusColorMap]
                    )}
                >
                    <Icon
                        className={cn(
                            row.original.status === "processing" && "animate-spin"
                        )}
                    />
                    {row.original.status}
                </Badge>
            )
        },
    },
    {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
            <div className="text-sm text-muted-foreground">
                {format(row.original.createdAt, "MMM d, yyyy")}
            </div>
        ),
    },
    {
        accessorKey: "duration",
        header: "Duration",
        cell: ({ row }) => (
            <Badge
                variant="outline"
                className="capitalize [&>svg]:size-4 flex items-center gap-x-2"
            >
                <ClockFadingIcon className="text-blue-700" />
                {row.original.duration ? formatDuration(row.original.duration) : "No duration"}
            </Badge>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const meeting = row.original;
            
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(meeting)}>
                                <EditIcon className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        )}
                        {onDelete && (
                            <DropdownMenuItem 
                                onClick={() => onDelete(meeting)}
                                className="text-red-600"
                            >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

// Default columns for backward compatibility
export const columns = createMeetingColumns();
