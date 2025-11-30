"use client";

import {
    Call,
    CallingState,
    StreamCall,
    StreamVideo,
    StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { LoaderIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from "./call-ui";
import { AgentClient } from "./agent-client";

interface Props {
    meetingId: string;
    meetingName: string;
    userId: string;
    userName: string;
    userImage: string;
}

export const CallConnect = ({
    meetingId,
    meetingName,
    userId,
    userName,
    userImage,
}: Props) => {
    const trpc = useTRPC();
    const { mutateAsync: generateToken } = useMutation(
        trpc.meetings.generateToken.mutationOptions(),
    );
    const [client, setClient] = useState<StreamVideoClient>();

    useEffect(() => {

        const _client = new StreamVideoClient({
            apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
            user: {
                id: userId,
                name: userName,
                image: userImage,
            },
            tokenProvider: generateToken,
        });

        setClient(_client);
        return () => {
            _client.disconnectUser();
            setClient(undefined);
        };
    }, [generateToken, userId, userName, userImage]);

    const [call, setCall] = useState<Call>();
    const [meetingData, setMeetingData] = useState<any>(null);
    
    // Get meeting data to access agent information
    const { data: meeting } = useQuery(
        trpc.meetings.getOne.queryOptions({ id: meetingId })
    );
    
    useEffect(() => {
        if (meeting) {
            setMeetingData(meeting);
        }
    }, [meeting]);
    
    useEffect(() => {
        if (!client) return;
        
        const initializeCall = async () => {
            try {
                const _call = client.call("default", meetingId);
                
                // Create or get the call
                await _call.getOrCreate();
                
                // Disable camera and microphone initially
                _call.camera.disable();
                _call.microphone.disable();
                
                setCall(_call);
            } catch (error) {
                console.error("Failed to initialize call:", error);
            }
        };
        
        initializeCall();
        
        return () => {
            // Cleanup will be handled when component unmounts
        };
    }, [client, meetingId]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (call && call.state.callingState !== CallingState.LEFT) {
                call.leave().catch(console.error);
            }
        };
    }, [call]);

    if (!client || !call) {
        return (
            <div className="h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <LoaderIcon className="size-8 animate-spin mx-auto mb-4" />
                    <p>Connecting to call...</p>
                </div>
            </div>
        );
    }
    return (
        <StreamVideo client={client}>
            <StreamCall call={call}>
                <CallUI meetingName={meetingName} meetingId={meetingId} />
                {/* Auto-join agent when call is ready and meeting data is loaded */}
                {meetingData?.agent && (
                    <AgentClient
                        meetingId={meetingId}
                        agentId={meetingData.agent.id}
                        agentName={meetingData.agent.name}
                        onAgentJoined={() => {
                            console.log(`Agent ${meetingData.agent.name} auto-joined the call`);
                        }}
                    />
                )}
            </StreamCall>
        </StreamVideo>
    );
};