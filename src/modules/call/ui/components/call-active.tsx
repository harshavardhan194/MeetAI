import Link from "next/link";
import Image from "next/image";
import { CallControls, SpeakerLayout } from "@stream-io/video-react-sdk";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCall } from "@stream-io/video-react-sdk";
import { useEffect, useState, useRef } from "react";
import { VirtualAgent } from "./virtual-agent";

interface Props {
    onLeave: () => void;
    meetingName: string;
    meetingId: string;
}

export const CallActive = ({ onLeave, meetingName, meetingId }: Props) => {
    const trpc = useTRPC();
    const call = useCall();
    const [shouldSpawnAgent, setShouldSpawnAgent] = useState(false);
    const hasSpawnedRef = useRef(false);
    const [agentJoined, setAgentJoined] = useState(false);
    
    // Get meeting details to find the agent
    const { data: meeting } = useQuery(
        trpc.meetings.getOne.queryOptions({ id: meetingId })
    );

    // Listen for agent join signals from webhook
    useEffect(() => {
        if (!call || hasSpawnedRef.current) return;

        const checkForAgentSignal = async () => {
            // Force refresh the call state to get latest custom data
            try {
                await call.get();
            } catch (error) {
                console.log("⚠️ Failed to refresh call state:", error);
            }
            
            const customData = call.state.custom;
            console.log("🔍 Checking for agent signal. Custom data:", JSON.stringify(customData, null, 2));
            console.log("🔍 hasSpawnedRef.current:", hasSpawnedRef.current);
            console.log("🔍 shouldSpawnAgent:", shouldSpawnAgent);
            console.log("🔍 agentJoined:", agentJoined);
            
            if (customData?.shouldJoinAgent && !hasSpawnedRef.current) {
                console.log("🎯 Received agent join signal from webhook:", customData);
                console.log("🔍 Current state - shouldSpawnAgent:", shouldSpawnAgent, "agentJoined:", agentJoined);
                hasSpawnedRef.current = true;
                setShouldSpawnAgent(true);
                toast.success(`🤖 Spawning AI agent ${customData.agentName}...`);
            } else if (customData?.shouldJoinAgent && hasSpawnedRef.current) {
                console.log("⚠️ Agent signal exists but already spawned");
            } else if (!customData?.shouldJoinAgent) {
                console.log("ℹ️ No agent signal found in custom data");
            }
        };

        // Check immediately
        checkForAgentSignal();

        // Set up interval to check for signals more frequently
        const interval = setInterval(checkForAgentSignal, 500);

        // Also listen for call state changes
        const subscription = call.state.custom$.subscribe((customData) => {
            console.log("📡 Call custom data changed:", customData);
            if (customData?.shouldJoinAgent && !hasSpawnedRef.current) {
                console.log("🎯 Agent signal detected via subscription");
                hasSpawnedRef.current = true;
                setShouldSpawnAgent(true);
                toast.success(`🤖 Spawning AI agent ${customData.agentName}...`);
            }
        });

        return () => {
            clearInterval(interval);
            subscription.unsubscribe();
        };
    }, [call]);

    // Manual trigger for testing
    const triggerAgent = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'call.session_started',
                    call: {
                        custom: {
                            meetingId: meetingId
                        }
                    }
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to trigger agent');
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Agent joining triggered!");
        },
        onError: (error) => {
            toast.error(`Failed to trigger agent: ${error.message}`);
        },
    });

    const handleTriggerAgent = () => {
        triggerAgent.mutate();
    };






    return (
        <div className="flex flex-col justify-between p-4 h-full text-white">
            {/* Virtual Agent - spawns when webhook signals */}
            {shouldSpawnAgent && !agentJoined && (
                <VirtualAgent
                    meetingId={meetingId}
                    onAgentJoined={() => {
                        setAgentJoined(true);
                        toast.success("🤖 AI Agent joined the call!");
                    }}
                    onAgentLeft={() => {
                        setAgentJoined(false);
                        toast.info("🤖 AI Agent left the call");
                        setShouldSpawnAgent(false);
                        hasSpawnedRef.current = false;
                    }}
                />
            )}
            <div className="bg-[#101213] rounded-full p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center justify-center p-1 bg-white/10 rounded-full w-fit">
                        <Image src="/logo.svg" width={22} height={22} alt="Logo" />
                    </Link>
                    <h4 className="text-base">
                        {meetingName}
                    </h4>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-sm text-white/70">
                        {shouldSpawnAgent ? "🤖 AI Agent spawning..." : agentJoined ? "🤖 AI Agent active" : "🤖 AI Agent ready"}
                    </div>
                    {agentJoined && (
                        <div className="text-sm text-green-400 font-medium">
                            ✅ AI Agent Active
                        </div>
                    )}
                </div>
            </div>
            <SpeakerLayout />
            <div className="bg-[#101213] rounded-full px-4">
                <CallControls onLeave={onLeave} />
            </div>

            {/* Floating Spawn AI Agent Button - Bottom Right */}
            {!agentJoined && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Button
                        onClick={async () => {
                            console.log("🔘 Manual agent spawn triggered via force API");
                            try {
                                const response = await fetch('/api/force-spawn-agent', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ meetingId }),
                                });
                                
                                if (response.ok) {
                                    const data = await response.json();
                                    setAgentJoined(true);
                                    toast.success(`🤖 ${data.agentName} joined the call!`);
                                } else {
                                    const error = await response.text();
                                    toast.error(`Failed to spawn agent: ${error}`);
                                }
                            } catch (error) {
                                console.error("Failed to spawn agent:", error);
                                toast.error("Failed to spawn agent");
                            }
                        }}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6 py-3"
                    >
                        🤖 Spawn AI Agent
                    </Button>
                </div>
            )}
        </div>
    );
};