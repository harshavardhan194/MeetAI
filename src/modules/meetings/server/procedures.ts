import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { MeetingStatus } from "../types";
import { streamClient, streamVideo } from "@/lib/stream-video";
import { generateAvatarUri } from "@/lib/avatar";


export const meetingsRouter = createTRPCRouter({
  generateToken: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const userId = input?.userId || ctx.auth.user.id;
      const isAgent = userId !== ctx.auth.user.id;
      
      await streamClient.upsertUsers([
        {
          id: userId,
          name: isAgent ? `Agent-${userId}` : ctx.auth.user.name,
          role: isAgent ? "user" : "admin",
          image: isAgent 
            ? generateAvatarUri({ seed: `Agent-${userId}`, variant: "botttsNeutral" })
            : (ctx.auth.user.image ?? generateAvatarUri({ seed: ctx.auth.user.name, variant: "initials" })),
        }
      ]);
      
      const expirationTime = Math.floor(Date.now() / 1000) + 3600;
      const issuedAt = Math.floor(Date.now() / 1000) - 60;
      const token = streamClient.generateUserToken({
        user_id: userId,
        exp: expirationTime,
        iat: issuedAt,
      });
      return token;
    }),
  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedMeeting] = await db
        .update(meetings)
        .set(input)
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userId, ctx.auth.user.id),
          ),
        )
        .returning();

      if (!updatedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return updatedMeeting;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [deletedMeeting] = await db
        .delete(meetings)
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userId, ctx.auth.user.id),
          ),
        )
        .returning();

      if (!deletedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return deletedMeeting;
    }),

  create: protectedProcedure
    .input(meetingsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [createdMeeting] = await db
        .insert(meetings)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      const call = streamVideo.call("default", createdMeeting.id);
      await call.create({
        data: {
          created_by_id: ctx.auth.user.id,
          custom: {
            meetingId: createdMeeting.id,
            meetingName: createdMeeting.name,
          },
          settings_override: {
            transcription: {
              language: "en",
              mode: "auto-on",
              closed_caption_mode: "auto-on",
            },
            recording: {
              mode: "auto-on",
              quality: "1080p",
            },
          },
        },
      });

      const [existingAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, createdMeeting.agentId));

      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
        }
      
        await streamClient.upsertUsers([
        {
          id: existingAgent.id,
          name: existingAgent.name,
          role: "user",
          image: generateAvatarUri({
            seed: existingAgent.name, 
            variant: "botttsNeutral",
          }),
        }
      ]);
      return createdMeeting;
    }),

  addAgentToCall: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      console.log("Adding agent to call for meeting:", input.meetingId);
      
      const [meetingWithAgent] = await db
        .select({
          meetingId: meetings.id,
          meetingName: meetings.name,
          agentId: agents.id,
          agentName: agents.name,
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.id, input.meetingId),
            eq(meetings.userId, ctx.auth.user.id)
          )
        );

      if (!meetingWithAgent) {
        console.error("Meeting not found for user");
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      console.log("Found meeting and agent:", meetingWithAgent);

      const call = streamVideo.call("default", input.meetingId);
      
      try {
        // First, ensure the agent user exists in Stream
        console.log("Upserting agent user in Stream...");
        await streamClient.upsertUsers([
          {
            id: meetingWithAgent.agentId,
            name: meetingWithAgent.agentName,
            role: "user",
          }
        ]);

        // Get or create the call first with proper created_by
        console.log("Getting/creating call...");
        await call.getOrCreate({
          data: {
            created_by_id: ctx.auth.user.id,
          }
        });

        // Add the agent as a call member with proper permissions
        console.log("Adding agent as call member...");
        const updateResult = await call.updateCallMembers({
          update_members: [
            {
              user_id: meetingWithAgent.agentId,
              role: "user"
            }
          ]
        });
        
        console.log("Update members result:", updateResult);

        // Also add the agent to the call participants
        console.log("Adding agent to call participants...");
        try {
          // Get current call data first
          const callData = await call.get();
          await call.update({
            custom: {
              ...callData.call.custom,
              agentJoined: true,
              agentId: meetingWithAgent.agentId
            }
          });
        } catch (updateError) {
          console.log("Call update failed, but continuing...", updateError);
        }
        
        console.log(`✅ Agent ${meetingWithAgent.agentName} successfully joined the call`);
        return { success: true, message: "Agent joined the call" };
      } catch (error) {
        console.error("❌ Failed to add agent to call:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add agent to call: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  getOne: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const [existingMeeting] = await db
      .select({
        ...getTableColumns(meetings),
        agent: agents,
      })
      .from(meetings)
      .innerJoin(agents, eq(meetings.agentId, agents.id))
      .where(
        and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)),
      );

    if (!existingMeeting) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
    }

    return existingMeeting;
  }),

  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
        agentId: z.string().nullish(),
        status: z.enum([
          MeetingStatus.Upcoming,
          MeetingStatus.Active,
          MeetingStatus.Completed,
          MeetingStatus.Processing,
          MeetingStatus.Cancelled,
        ]).nullish(),

      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize, status, agentId } = input;

      const data = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT (EPOCH FROM(ended_at-started_at))`.as("duration"),
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          ),
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [total] = await db
        .select({ count: count() })
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          ),
        );

      const totalPages = Math.ceil(total.count / pageSize);

      return {
        items: data,
        total: total.count,
        totalPages,
      };
    }),
});