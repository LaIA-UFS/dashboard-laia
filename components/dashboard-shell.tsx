"use client";

import { memo, useState } from "react";
import { MembersSection } from "@/components/members-section";
import { MemberSelector } from "@/components/member-selector";
import { ProjectsSection } from "@/components/projects-section";
import { StatsCharts } from "@/components/stats-charts";
import type { DashboardData } from "@/lib/types";

const MemoStatsCharts = memo(StatsCharts);
const MemoProjectsSection = memo(ProjectsSection);

interface DashboardShellProps {
  data: DashboardData;
}

export function DashboardShell({ data }: DashboardShellProps) {
  const [selectedMemberSlug, setSelectedMemberSlug] = useState<string | null>(null);
  const selectedMember = data.members.find(member => member.slug === selectedMemberSlug) ?? null;

  return (
    <>
      <MemberSelector
        members={data.members}
        selectedMember={selectedMember}
        onSelect={member => setSelectedMemberSlug(member?.slug ?? null)}
      />
      <MemoStatsCharts members={data.members} analyses={data.analyses} />
      <MemoProjectsSection
        members={data.members}
        projects={data.projects}
        analyses={data.analyses}
      />
      <MembersSection members={data.members} overview />
    </>
  );
}
