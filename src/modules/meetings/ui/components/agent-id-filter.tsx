import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import GenerateAvatar from "@/components/generate-avatar";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";
import { CommandSelect } from "@/components/command-select";

export const AgentIdFilter = () => {
    const [filters, setFilters] = useMeetingsFilters();
    const trpc = useTRPC();
    const [agentSearch, setAgentSearch] = useState("");
    const { data } = useQuery(
        trpc.agents.getMany.queryOptions({
            pageSize: 100,
            search: agentSearch,
        }),
    );

    return (
        <CommandSelect
            className="h-9"
            placeholder="Agent"
            options={[
                {
                    id: "all",
                    value: "all",
                    children: <span>All Agents</span>
                },
                ...(data?.items ?? []).map((agent) => ({
                    id: agent.id,
                    value: agent.id,
                    children: (
                        <div className="flex items-center gap-x-2">
                            <GenerateAvatar
                                seed={agent.name}
                                variant="botttsNeutral"
                                className="size-4"
                            />
                            <span>{agent.name}</span>
                        </div>
                    )
                }))
            ]}
            onSelect={(value) => setFilters({ agentId: value === "all" ? undefined : value })}
            onSearch={setAgentSearch}
            value={filters.agentId ?? ""}
            emptyAction={{
                label: "Clear Filter",
                onClick: () => setFilters({ agentId: undefined })
            }}
        />
    );
};