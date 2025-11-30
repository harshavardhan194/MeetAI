import { ResponsiveDialog } from "@/components/responsive-dialog";
import { AgentForm } from "./agent-form";
import { AgentGetOne } from "../../types";

interface UpdateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: AgentGetOne;
}

const UpdateAgentDialog: React.FC<UpdateAgentDialogProps> = ({ open, onOpenChange ,initialValues }) => {
  return (
    <ResponsiveDialog title="Edit Agent" description="Edit the agent details" open={open} onOpenChange={onOpenChange}>
      <AgentForm onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)}
      initialValues={initialValues} />
    </ResponsiveDialog>
  );
};

export default UpdateAgentDialog;
