"use client";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { DataTable } from "@/components/ data-table";
import { createMeetingColumns } from "../components/columns";
import { EditMeetingDialog } from "../components/edit-meeting-dialog";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MeetingGetMany } from "../../types";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";  
import { DataPagination } from "@/components/data-pagination";

export const MeetingsView = () => {
    const trpc = useTRPC();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useMeetingsFilters();
    const [editingMeeting, setEditingMeeting] = useState<MeetingGetMany[number] | null>(null);

    const pageSize = 20;

    const { data, isLoading, error } = useQuery(
        trpc.meetings.getMany.queryOptions({
            search: filters.search || undefined,
            page: filters.page,
            pageSize,
            agentId: filters.agentId || undefined,
            status: filters.status || undefined,
        })
    );

    const deleteMeeting = useMutation(
        trpc.meetings.delete.mutationOptions({
            onSuccess: () => {
                toast.success("Meeting deleted successfully");
                queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
            },
            onError: (error) => {
                toast.error(`Error deleting meeting: ${error.message}`);
            },
        })
    );

    const handleEdit = (meeting: MeetingGetMany[number]) => {
        setEditingMeeting(meeting);
    };

    const handleDelete = (meeting: MeetingGetMany[number]) => {
        if (confirm(`Are you sure you want to delete "${meeting.name}"? This action cannot be undone.`)) {
            deleteMeeting.mutate({ id: meeting.id });
        }
    };

    const columns = createMeetingColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
    });

    if (isLoading) {
        return <LoadingState title="Loading Meetings" description="This may take a few seconds" />;
    }

    if (error) {
        return (
            <ErrorState
                title="Error loading meetings"
                description="Something went wrong while loading the meetings"
            />
        );
    }

    return (
        <>
            {editingMeeting && (
                <EditMeetingDialog
                    open={!!editingMeeting}
                    onOpenChange={(open) => !open && setEditingMeeting(null)}
                    meeting={editingMeeting}
                    onSuccess={() => {
                        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
                        toast.success("Meeting updated successfully");
                    }}
                />
            )}
            <div className="space-y-4 px-4 md:px-8">
            {/* Data Table */}
            <div className="overflow-x-auto">
                <DataTable 
                    data={data?.items || []} 
                    columns={columns} 
                    onRowClick={(meeting) => router.push(`/meetings/${meeting.id}`)}
                />
            </div>
            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {((filters.page - 1) * pageSize) + 1} to {Math.min(filters.page * pageSize, data.total)} of {data.total} meetings
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFilters({ page: filters.page - 1 })}
                            disabled={filters.page <= 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {filters.page} of {data.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFilters({ page: filters.page + 1 })}
                            disabled={filters.page >= data.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {data?.items.length === 0 && (
                <div className="text-center py-12">
                    <h3 className="text-lg font-semibold">No meetings found</h3>
                    <p className="text-muted-foreground mt-2">
                        {filters.search || filters.agentId || filters.status ? "Try adjusting your filters" : "Get started by creating your first meeting"}
                    </p>
                    {!filters.search && !filters.agentId && !filters.status && (
                        <p className="text-sm mt-2">Use the "New Meeting" button above to create your first meeting</p>
                    )}
                </div>
            )}
            </div>
        </>
    );
};

export const MeetingsViewLoading = () => {
    return <LoadingState title="Loading Meetings" description="This may take a few seconds" />;
};

export const MeetingsViewError = () => {
    return (
        <ErrorState
            title="Error loading meetings"
            description="Something went wrong while loading the meetings"
        />
    );
};
