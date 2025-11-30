import { useState } from "react";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";
import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
    meetingName: string;
    meetingId: string;
}

export const CallUI = ({ meetingName, meetingId }: Props) => {
    const call = useCall();
    const router = useRouter();
    const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");

    const handleJoin = async () => {
        if (!call) {
            console.error("No call object available");
            return;
        }
        
        try {
            console.log("Joining call...", call.id);
            console.log("Call state:", call.state.callingState);
            
            // Join the call with create option
            await call.join({ create: true });
            
            console.log("Successfully joined call");
            setShow("call");
        } catch (error) {
            console.error("Failed to join call:", error);
            // You might want to show an error message to the user here
        }
    };

    const handleLeave = async () => {
        if (!call) return;
        
        try {
            console.log("Leaving call...");
            await call.leave();
            console.log("Successfully left call");
            setShow("ended");
        } catch (error) {
            console.error("Failed to leave call:", error);
            // Still show ended state even if leave fails
            setShow("ended");
        }
    };

    const handleBackToMeeting = () => {
        router.push(`/meetings/${meetingId}`);
    };
    return (
        <StreamTheme className="h-full">
            {show === "lobby" && <CallLobby onJoin={handleJoin} />}
            {show === "call" && (
                <CallActive onLeave={handleLeave} meetingName={meetingName} meetingId={meetingId} />
            )}
            {show === "ended" && (
                <div className="flex flex-col items-center justify-center h-full bg-black text-white">
                    <div className="text-center space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Call Ended</h2>
                            <p className="text-gray-300">Thank you for joining {meetingName}</p>
                        </div>
                        <Button 
                            onClick={handleBackToMeeting}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                        >
                            <ArrowLeftIcon className="size-4 mr-2" />
                            Back to Meeting
                        </Button>
                    </div>
                </div>
            )}
        </StreamTheme>
    );
};
