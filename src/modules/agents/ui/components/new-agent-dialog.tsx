import { ResponsiveDialog } from "@/components/responsive-dialog";
import { AgentForm } from "./agent-form";

interface NewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (agent: { id: string; name: string }) => void;
}

const NewAgentDialog: React.FC<NewAgentDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  return (
    <ResponsiveDialog title="New Agent" description="Create a new agent" open={open} onOpenChange={onOpenChange}>
      <AgentForm 
        onSuccess={(agent) => {
          onSuccess?.(agent);
          onOpenChange(false);
        }} 
        onCancel={() => onOpenChange(false)} 
      />
    </ResponsiveDialog>
  );
};

export default NewAgentDialog;
