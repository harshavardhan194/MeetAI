
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { meetingFormSchema, meetingsInsertSchema } from "../../schemas";
import type { MeetingGetOne } from "../../types";
import { CommandSelect } from "@/components/command-select";
import GenerateAvatar from "@/components/generate-avatar";
import NewAgentDialog from "@/modules/agents/ui/components/new-agent-dialog";

interface MeetingFormProps {
  onSuccess?: (meeting: { id: string }) => void;
  onCancel?: () => void;
  initialValues?: MeetingGetOne;
}

export const MeetingForm = ({ onSuccess, onCancel, initialValues }: MeetingFormProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [openNewAgentDialog, setOpenNewAgentDialog] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  const agents = useQuery(
    trpc.agents.getMany.queryOptions({
      pageSize: 100,
      search: agentSearch,
    }),
  );

  const createMeeting = useMutation(
    trpc.meetings.create.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));



        onSuccess?.(data);
      },
      onError: (error) => {
        toast.error(`Error creating meeting: ${error.message}`);
        // TODO: Check if error code is 'CONFLICT' and show a specific message
      },
    })
  );
  const updateMeeting = useMutation(
    trpc.meetings.update.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));

        if (initialValues?.id) {
          await queryClient.invalidateQueries(trpc.meetings.getOne.queryOptions({ id: initialValues.id }));
        }

        onSuccess?.(data);
      },
      onError: (error) => {
        toast.error(`Error creating meeting: ${error.message}`);
        // TODO: Check if error code is 'CONFLICT' and show a specific message
      },
    })
  );

  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      agentId: initialValues?.agentId ?? "",
    },
  });

  const isEdit = !!initialValues?.id;
  const isPending = createMeeting.isPending || updateMeeting.isPending;

  const onSubmit = (values: z.infer<typeof meetingFormSchema>) => {
    if (isEdit) {
      updateMeeting.mutate({ ...values, id: initialValues.id, instructions: initialValues?.instructions ?? "Default meeting instructions" });
    } else {
      // Transform the form data to include instructions
      const transformedData = meetingsInsertSchema.parse(values);
      createMeeting.mutate(transformedData);
    }
  };

  return (
    <>
      <NewAgentDialog 
        open={openNewAgentDialog} 
        onOpenChange={setOpenNewAgentDialog}
        onSuccess={(agent: { id: string; name: string }) => {
          form.setValue("agentId", agent.id);
          queryClient.invalidateQueries(trpc.agents.getMany.queryOptions({}));
        }}
      />
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} ref={firstInputRef} placeholder="Enter meeting name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="agentId"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent</FormLabel>
                <FormControl>
                  <CommandSelect
                    options={(agents.data?.items ?? []).map((agent) => ({
                      id: agent.id,
                      value: agent.id,
                      children: (
                        <div className="flex items-center gap-x-2">
                          <GenerateAvatar
                            seed={agent.name}
                            variant="botttsNeutral"
                            className="border size-6"
                          />
                          <span>{agent.name}</span>
                        </div>
                      )
                    }))}
                    onSelect={field.onChange}
                    onSearch={setAgentSearch}
                    value={field.value}
                    placeholder="Select an agent"
                    emptyAction={{
                      label: "Create New Agent",
                      onClick: () => setOpenNewAgentDialog(true)
                    }}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between gap-x-2">
            {onCancel && (
              <Button onClick={onCancel} disabled={isPending} variant="ghost" className="mr-2" type="button">
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Update Meeting" : "Create Meeting"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
