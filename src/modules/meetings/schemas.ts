import { z } from "zod";

export const meetingFormSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    agentId: z.string().min(1, { message: "Agent is required" }),
});

export const meetingsInsertSchema = meetingFormSchema.transform((data) => ({
    ...data,
    instructions: "Default meeting instructions", // Provide default value for database
}));

export const meetingsUpdateSchema = meetingFormSchema.extend({
    id: z.string().min(1, { message: "Id is required" }),
    instructions: z.string().min(1, { message: "Instructions are required" }),
});