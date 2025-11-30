import { agentsRouter } from "@/modules/agents/server/procedures";
import { meetingsRouter } from "@/modules/meetings/server/procedures";

import { createTRPCRouter } from "../init";
import { meetings } from "@/db/schema";
export const appRouter = createTRPCRouter({
  agents: agentsRouter,
  meetings:meetingsRouter, 

});
// export type definition of API
export type AppRouter = typeof appRouter;

