"use client";

import { useState } from "react";
import { MemberSelector } from "@/components/member-selector";
import { ProjectsSection } from "@/components/projects-section";
import { StatsCharts } from "@/components/stats-charts";
import type { DashboardData } from "@/lib/types";

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
      <StatsCharts members={data.members} analyses={data.analyses} />
      <ProjectsSection
        members={data.members}
        projects={data.projects}
        analyses={data.analyses}
      />
    </>
  );
}
