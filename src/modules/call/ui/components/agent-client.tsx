"use client";

import { useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

interface AgentClientProps {
    meetingId: string;
    agentId: string;
    agentName: string;
    onAgentJoined?: () => void;
}

export const AgentClient = ({ meetingId, agentId, agentName, onAgentJoined }: AgentClientProps) => {
    const trpc = useTRPC();
    
    const addAgentMutation = useMutation(
        trpc.meetings.addAgentToCall.mutationOptions({
            onSuccess: () => {
                console.log(`✅ Agent ${agentName} added to call`);
                onAgentJoined?.();
            },
            onError: (error) => {
                console.error("❌ Failed to add agent:", error);
            },
        })
    );

    useEffect(() => {
        // Add a small delay to ensure the call is fully initialized
        const timer = setTimeout(() => {
            console.log("Adding agent to call:", agentName);
            addAgentMutation.mutate({ meetingId });
        }, 3000); // 3 second delay

        return () => {
            clearTimeout(timer);
        };
    }, [meetingId, agentName]); // Removed addAgentMutation from deps to avoid re-triggering

    // This component doesn't render anything visible
    return null;
};