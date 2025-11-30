"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { useState } from "react";
import { toast } from "sonner";
import { EditMeetingDialog } from "../components/edit-meeting-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, PlayIcon, XIcon, EditIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import GenerateAvatar from "@/components/generate-avatar";
import { cn } from "@/lib/utils";

interface MeetingDetailViewProps {
  meetingId: string;
  onBack?: () => void;
  onDelete?: () => void;
}

const statusColorMap = {
  upcoming: "bg-yellow-500/20 text-yellow-800 border-yellow-800/5",
  active: "bg-blue-500/20 text-blue-800 border-blue-800/5",
  completed: "bg-emerald-500/20 text-emerald-800 border-emerald-800/5",
  cancelled: "bg-rose-500/20 text-rose-800 border-rose-800/5",
  processing: "bg-gray-300/20 text-gray-800 border-gray-800/5",
};

export const MeetingDetailView = ({ meetingId, onBack, onDelete }: MeetingDetailViewProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: meeting, isLoading, error } = useQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId })
  );

  const deleteMeeting = useMutation(
    trpc.meetings.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Meeting deleted successfully");
        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
        onDelete?.();
      },
      onError: (error) => {
        toast.error(`Error deleting meeting: ${error.message}`);
      },
    })
  );

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
      deleteMeeting.mutate({ id: meetingId });
    }
  };

  if (isLoading) {
    return <LoadingState title="Loading Meeting" description="Please wait..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading meeting"
        description="Something went wrong while loading the meeting details"
      />
    );
  }

  if (!meeting) {
    return (
      <ErrorState
        title="Meeting not found"
        description="The meeting you're looking for doesn't exist"
      />
    );
  }

  return (
    <>
      {meeting && (
        <EditMeetingDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          meeting={meeting}
          onSuccess={() => {
            queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({ id: meetingId }));
            toast.success("Meeting updated successfully");
          }}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeftIcon className="size-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">{meeting.name}</h1>
              <p className="text-muted-foreground">Meeting Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(true)}
              disabled={deleteMeeting.isPending}
            >
              <EditIcon className="size-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteMeeting.isPending}
            >
              <TrashIcon className="size-4 mr-2" />
              {deleteMeeting.isPending ? "Deleting..." : "Delete"}
            </Button>
            {(meeting.status === "upcoming" || meeting.status === "active") && (
              <Button variant="outline">
                <XIcon className="size-4 mr-2" />
                Cancel Meeting
              </Button>
            )}
            {meeting.status === "upcoming" && (
              <Button asChild>
                <Link href={`/call/${meetingId}`}>
                  <PlayIcon className="size-4 mr-2" />
                  Start Meeting
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Meeting Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  statusColorMap[meeting.status as keyof typeof statusColorMap]
                )}
              >
                {meeting.status}
              </Badge>
            </CardContent>
          </Card>

          {/* Agent Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <GenerateAvatar
                  seed={meeting.agent?.name || "Unknown"}
                  variant="botttsNeutral"
                  className="size-8 border"
                />
                <span className="font-medium">{meeting.agent?.name || "Unknown Agent"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Created Date Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Created</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{format(meeting.createdAt, "PPP")}</p>
            </CardContent>
          </Card>

          {/* Started Date Card */}
          {meeting.startedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Started</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{format(meeting.startedAt, "PPP 'at' p")}</p>
              </CardContent>
            </Card>
          )}

          {/* Ended Date Card */}
          {meeting.endedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ended</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{format(meeting.endedAt, "PPP 'at' p")}</p>
              </CardContent>
            </Card>
          )}

          {/* Duration Card */}
          {meeting.startedAt && meeting.endedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {Math.round((new Date(meeting.endedAt).getTime() - new Date(meeting.startedAt).getTime()) / 1000 / 60)} minutes
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions Card */}
        {meeting.instructions && (
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {meeting.instructions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recording and Transcription */}
        <Card>
          <CardHeader>
            <CardTitle>Recording & Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meeting.recordingUrl ? (
                <div>
                  <h4 className="font-medium mb-2">📹 Recording</h4>
                  <a 
                    href={meeting.recordingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Recording
                  </a>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <p>📹 No recording available</p>
                  {meeting.status === "upcoming" && (
                    <p className="text-sm">Recording will be available after the meeting</p>
                  )}
                </div>
              )}

              {meeting.transcriptUrl ? (
                <div>
                  <h4 className="font-medium mb-2">📝 Transcript</h4>
                  <div className="flex items-center gap-3">
                    <a 
                      href={meeting.transcriptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Transcript
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/get-transcript-text', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ meetingId: meeting.id }),
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            await navigator.clipboard.writeText(data.plainText);
                            toast.success("Transcript copied to clipboard!");
                          } else {
                            const error = await response.json();
                            toast.error(`Failed to copy transcript: ${error.error}`);
                          }
                        } catch (error) {
                          console.error("Failed to copy transcript:", error);
                          toast.error("Failed to copy transcript");
                        }
                      }}
                      className="text-xs"
                    >
                      📋 Copy as Text
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <p>📝 No transcript available</p>
                  {meeting.status === "upcoming" && (
                    <p className="text-sm">Transcript will be available after the meeting</p>
                  )}
                </div>
              )}

              {meeting.status === "completed" && (!meeting.recordingUrl || !meeting.transcriptUrl) && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    📋 Recording and transcription processing can take a few minutes after the meeting ends.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/fetch-meeting-data', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ meetingId: meeting.id }),
                        });
                        if (response.ok) {
                          const data = await response.json();
                          toast.success("Meeting data refreshed!");
                          queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({ id: meeting.id }));
                        }
                      } catch (error) {
                        toast.error("Failed to refresh meeting data");
                      }
                    }}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    🔄 Check for Updates
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export const MeetingDetailViewLoading = () => {
  return <LoadingState title="Loading Meeting" description="Please wait..." />;
};

export const MeetingDetailViewError = () => {
  return (
    <ErrorState
      title="Error loading meeting"
      description="Something went wrong while loading the meeting details"
    />
  );
};