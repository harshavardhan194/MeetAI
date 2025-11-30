import { ResponsiveDialog } from "@/components/responsive-dialog";
import { MeetingForm } from "./meeting-form";
import type { MeetingGetOne } from "../../types";

interface EditMeetingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    meeting: MeetingGetOne;
    onSuccess?: () => void;
}

export const EditMeetingDialog = ({
    open,
    onOpenChange,
    meeting,
    onSuccess,
}: EditMeetingDialogProps) => {
    return (
        <ResponsiveDialog 
            title="Edit Meeting" 
            description="Update meeting details" 
            open={open} 
            onOpenChange={onOpenChange}
        >
            <MeetingForm
                initialValues={meeting}
                onSuccess={() => {
                    onSuccess?.();
                    onOpenChange(false);
                }}
                onCancel={() => onOpenChange(false)}
            />
        </ResponsiveDialog>
    );
};

export default EditMeetingDialog;