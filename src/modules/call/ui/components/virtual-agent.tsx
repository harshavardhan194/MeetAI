"use client";

import { useEffect, useState } from "react";
import { StreamVideoClient, Call } from "@stream-io/video-react-sdk";

interface VirtualAgentProps {
    meetingId: string;
    onAgentJoined?: () => void;
    onAgentLeft?: () => void;
}

// Global registry to ensure only one agent per meeting
const activeAgents = new Map<string, string>(); // meetingId -> componentId

export const VirtualAgent = ({ meetingId, onAgentJoined, onAgentLeft }: VirtualAgentProps) => {
    const [agentClient, setAgentClient] = useState<StreamVideoClient | null>(null);
    const [agentCall, setAgentCall] = useState<Call | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const componentId = useState(() => Math.random().toString(36).substr(2, 9))[0];

    console.log(`🤖 VirtualAgent component created with ID: ${componentId} for meeting: ${meetingId}`);

    const joinAsAgent = async () => {
        // Check if another component is already handling this meeting
        const existingComponentId = activeAgents.get(meetingId);
        if (existingComponentId && existingComponentId !== componentId) {
            console.log(`⚠️ [${componentId}] Another component (${existingComponentId}) is already handling meeting:`, meetingId);
            return;
        }
        
        if (isJoining) {
            console.log(`⚠️ [${componentId}] Already joining for meeting:`, meetingId);
            return;
        }
        
        // Register this component as the active one for this meeting
        activeAgents.set(meetingId, componentId);
        setIsJoining(true);

        try {
            console.log(`👻 [${componentId}] Spawning virtual agent for meeting:`, meetingId);

            // First, spawn the agent on the server
            const spawnResponse = await fetch('/api/spawn-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId }),
            });

            if (!spawnResponse.ok) {
                if (spawnResponse.status === 409) {
                    console.log("⚠️ Agent already exists or spawning, skipping...");
                    setIsJoining(false);
                    joiningMeetings.delete(meetingId);
                    return;
                }
                const errorText = await spawnResponse.text();
                throw new Error(`Failed to spawn agent: ${errorText}`);
            }

            const spawnData = await spawnResponse.json();
            console.log("✅ Agent spawned successfully:", spawnData);

            // Create a StreamVideoClient for the agent
            console.log("🤖 Creating agent client...");
            const client = new StreamVideoClient({
                apiKey: spawnData.apiKey,
                user: {
                    id: spawnData.agentId,
                    name: `🤖 ${spawnData.agentName}`,
                    image: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
                },
                token: spawnData.agentToken,
            });

            setAgentClient(client);

            // Get the call
            const call = client.call("default", meetingId);
            setAgentCall(call);

            // Make the agent join the call as audio-only participant
            console.log("🤖 Agent joining call...");
            
            // Join the call first
            await call.join({ 
                create: false,
            });
            
            // Then disable camera (keep microphone enabled for AI voice)
            await call.camera.disable();
            
            console.log("🤖 Agent joined call successfully");

            // Wait a moment for the agent to fully join before connecting OpenAI
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Connect OpenAI for AI capabilities
            try {
                console.log("🎤 Connecting OpenAI for AI voice...");
                
                // Use Stream's OpenAI integration
                const response = await fetch('/api/connect-openai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        meetingId,
                        agentId: spawnData.agentId,
                        agentName: spawnData.agentName
                    }),
                });

                if (response.ok) {
                    console.log("✅ OpenAI connected for AI voice capabilities");
                } else {
                    console.log("⚠️ OpenAI connection failed, agent will be voice-only");
                }
            } catch (openAiError) {
                console.log("⚠️ OpenAI connection error:", openAiError);
            }
            
            console.log("✅ Virtual agent successfully joined the call!");
            onAgentJoined?.();

        } catch (error) {
            console.error(`❌ [${componentId}] Failed to join as virtual agent:`, error);
        } finally {
            setIsJoining(false);
            // Only remove if this component is still the active one
            if (activeAgents.get(meetingId) === componentId) {
                activeAgents.delete(meetingId);
            }
        }
    };

    const leaveAsAgent = async () => {
        try {
            if (agentCall) {
                console.log("🤖 Agent leaving call...");
                await agentCall.leave();
                setAgentCall(null);
            }
            if (agentClient) {
                await agentClient.disconnectUser();
                setAgentClient(null);
            }
            // Remove from active agents if this component is the active one
            if (activeAgents.get(meetingId) === componentId) {
                activeAgents.delete(meetingId);
            }
            console.log(`✅ [${componentId}] Virtual agent left the call`);
            onAgentLeft?.();
        } catch (error) {
            console.error("❌ Failed to leave as virtual agent:", error);
        }
    };

    // Auto-join when component mounts
    useEffect(() => {
        console.log(`🤖 [${componentId}] VirtualAgent component mounted, auto-joining...`);
        
        // Add a small random delay to help prevent race conditions
        const delay = Math.random() * 1000;
        const timer = setTimeout(() => {
            joinAsAgent();
        }, delay);
        
        return () => {
            clearTimeout(timer);
            leaveAsAgent();
        };
    }, []);

    // Expose join/leave functions
    useEffect(() => {
        (window as any).virtualAgent = {
            join: joinAsAgent,
            leave: leaveAsAgent,
            isJoining,
        };
    }, [isJoining]);

    // This component doesn't render anything visible
    return null;
};