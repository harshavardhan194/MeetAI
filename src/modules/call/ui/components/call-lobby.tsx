import { LogInIcon } from "lucide-react";
import {
    ToggleAudioPreviewButton,
    ToggleVideoPreviewButton,
    useCallStateHooks,
    VideoPreview,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { generateAvatarUri } from "@/lib/avatar";
import { authClient } from "@/lib/auth-client";

interface Props {
    onJoin: () => void;
}

const DisabledVideoPreview = () => {
    const { data } = authClient.useSession();
    const avatarUri = generateAvatarUri({
        seed: data?.user.name ?? "Anonymous",
        variant: "initials",
    });

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-700">
            <img
                src={avatarUri}
                alt={data?.user.name ?? "User"}
                className="w-16 h-16 rounded-full mb-3"
            />
            <p className="text-gray-300 text-sm">{data?.user.name ?? "Anonymous"}</p>
            <p className="text-gray-400 text-xs mt-1">Camera is off</p>
        </div>
    );
};

export const CallLobby = ({ onJoin }: Props) => {
    const { useCallCallingState, useCameraState, useMicrophoneState } = useCallStateHooks();
    const callingState = useCallCallingState();
    const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
    const { hasBrowserPermission: hasCameraPermission } = useCameraState();
    const { isMute: isCameraMute } = useCameraState();

    const isJoining = callingState === 'joining';
    const canJoin = callingState === 'idle';

    return (
        <div className="h-full bg-black text-white flex flex-col">
            {/* Header */}
            <div className="p-6 text-center">
                <h1 className="text-2xl font-bold mb-2">Join Meeting</h1>
                <p className="text-gray-300">Set up your camera and microphone</p>
            </div>

            {/* Video Preview */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="relative w-full max-w-md aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    {!isCameraMute ? (
                        <VideoPreview />
                    ) : (
                        <DisabledVideoPreview />
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 space-y-4">
                <div className="flex justify-center gap-4">
                    <ToggleVideoPreviewButton />
                    <ToggleAudioPreviewButton />
                </div>

                <div className="flex justify-center">
                    <Button
                        onClick={onJoin}
                        className="bg-green-600 hover:bg-green-700 px-8 py-3"
                        disabled={!canJoin}
                    >
                        <LogInIcon className="size-4 mr-2" />
                        {isJoining ? 'Joining...' : 'Join Meeting'}
                    </Button>
                </div>
            </div>
        </div>
    );
};