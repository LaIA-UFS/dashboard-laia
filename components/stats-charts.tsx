"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,

  Cell,
  PieChart,
  Pie,
  Tooltip,
} from "recharts";
import {
  BarChart3,
  BrainCircuit,
  Clock3,
  FileSearch,
  GraduationCap,
  Lightbulb,
  Target,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DashboardAnalyses, Member } from "@/lib/types";

interface StatsChartsProps {
  members: Member[];
  analyses: DashboardAnalyses;
}

const COLORS = [
  "#3838fa",
  "#a836f4",
  "#b4bffe",
  "#3838fa",
  "#a23aed",
  "#2828d9",
  "#2e1b99",
];

function metricValue(metrics: Map<string, number>, label: string, fallback = 0) {
  return metrics.get(label) ?? fallback;
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function DonutLegendList({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {data.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-secondary/20 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="truncate text-sm text-foreground">{item.label}</span>
          </div>
          <span className="shrink-0 text-sm font-medium text-primary">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StatsCharts({ members, analyses }: StatsChartsProps) {
  const isMobile = useIsMobile();
  const summaryMetrics = useMemo(
    () => new Map(analyses.summary.map((item) => [item.metric, item.value])),
    [analyses.summary]
  );

  const overviewCards = [
    {
      label: "Membros na Base",
      value: members.length,
      description: "Membros cadastrados no Notion",
      icon: Users,
    },
    {
      label: "Respostas no Forms",
      value: metricValue(summaryMetrics, "Respostas no Forms"),
      description: "Respostas válidas para análise",
      icon: FileSearch,
    },
    {
      label: "Média da Nota Técnica",
      value: summaryMetrics.get("Média da nota técnica") ?? "—",
      description: "Média entre respondentes avaliados",
      icon: BrainCircuit,
    },
  ];

  const courseData = analyses.byCourse;
  const careerData = analyses.topCareers.slice(0, 6);
  const availabilityData = analyses.byAvailability;
  const maturityData = analyses.byMaturity;
  const techData = analyses.topTechs.slice(0, 12);
  const attributeData = analyses.topAttributes.slice(0, 6);
  const technicalScoreData = analyses.technicalScoreByMaturity;

  return (
    <div className="space-y-4">
      <div className="w-full flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h2 className="text-lg font-semibold text-foreground sm:text-lg">
          Estatísticas Gerais
        </h2>
        <div className="ml-1 rounded-full bg-primary/20 px-2.5 py-1 sm:ml-2 sm:px-3">
          <span className="text-sm font-medium text-primary">
            {members.length} membros
          </span>
        </div>
      </div>
      <div className="w-full flex justify-center items-center">
        <div className="grid w-full gap-3 sm:grid-cols-3">
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card
                key={card.label}
                className="border-primary/20 bg-card/50"
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {typeof card.value === "number" && card.label.includes("Média")
                          ? card.value.toFixed(2)
                          : card.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 2xl:gap-3">
        <Card className="border-primary/20 bg-card/50 md:col-span-2 lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tecnologias Mais Citadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: "Citações", color: "#425bff" } }}
              className="h-[270px] w-full sm:h-[290px]"
            >
                <BarChart
                  data={techData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: isMobile ? 8 : 24,
                    left: 8,
                    bottom: 5,
                  }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={isMobile ? 10 : 12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 78 : 140}
                    tickFormatter={(value) =>
                      truncateLabel(String(value), isMobile ? 11 : 20)
                    }
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [`${value} citações`, "Tecnologia"]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}

                  >
                    {techData.map((_, index) => (
                      <Cell key={`tech-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 md:col-span-2 lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: "Membros", color: "#425bff" } }}
              className="h-[170px] w-full sm:h-[190px]"
            >
                <PieChart>
                  <Pie
                    data={courseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 26 : 42}
                    outerRadius={isMobile ? 58 : 86}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                    isAnimationActive={false}

                  >
                    {courseData.map((_, index) => (
                      <Cell key={`course-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number, name: string) => [`${value} membros`, name]}
                  />
                </PieChart>

            </ChartContainer>
            <DonutLegendList data={courseData} />
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 md:col-span-1 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <Target className="h-5 w-5 text-primary" />
              Carreiras Mais Citadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: "Citações", color: "#425bff" } }}
              className="h-[220px] w-full sm:h-[240px]"
            >
                <BarChart
                  data={careerData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 10,
                    left: 8,
                    bottom: 5,
                  }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={isMobile ? 10 : 12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 94 : 160}
                    tickFormatter={(value) =>
                      truncateLabel(String(value), isMobile ? 14 : 26)
                    }
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [`${value} citações`, "Carreira"]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}

                  >
                    {careerData.map((_, index) => (
                      <Cell key={`career-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 md:col-span-1 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <Clock3 className="h-5 w-5 text-primary" />
              Disponibilidade Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: "Membros", color: "#425bff" } }}
              className="h-[170px] w-full sm:h-[190px]"
            >
                <PieChart>
                  <Pie
                    data={availabilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 22 : 36}
                    outerRadius={isMobile ? 52 : 74}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                    isAnimationActive={false}

                  >
                    {availabilityData.map((_, index) => (
                      <Cell key={`availability-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number, name: string) => [`${value} membros`, name]}
                  />
                </PieChart>

            </ChartContainer>
            <DonutLegendList data={availabilityData} />
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 md:col-span-1 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <Users className="h-5 w-5 text-primary" />
              Nível de Maturidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: "Membros", color: "#425bff" } }}
              className="h-[220px] w-full sm:h-[240px]"
            >
                <BarChart
                  data={maturityData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 10,
                    left: 8,
                    bottom: 5,
                  }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={isMobile ? 10 : 12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 88 : 160}
                    tickFormatter={(value) =>
                      truncateLabel(String(value), isMobile ? 13 : 24)
                    }
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [`${value} membros`, "Maturidade"]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}

                  >
                    {maturityData.map((_, index) => (
                      <Cell key={`maturity-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 md:col-span-1 lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Atributos Mais Citados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: "Citações", color: "#425bff" } }}
              className="h-[220px] w-full sm:h-[240px]"
            >
                <BarChart
                  data={attributeData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 10,
                    left: 8,
                    bottom: 5,
                  }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={isMobile ? 10 : 12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 104 : 170}
                    tickFormatter={(value) =>
                      truncateLabel(String(value), isMobile ? 15 : 26)
                    }
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [`${value} citações`, "Atributo"]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}

                  >
                    {attributeData.map((_, index) => (
                      <Cell key={`attribute-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 md:col-span-2 lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Nota Técnica por Maturidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ notaMedia: { label: "Nota média", color: "#425bff" } }}
              className="h-[270px] w-full sm:h-[290px]"
            >
                <BarChart
                  data={technicalScoreData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 10,
                    left: 8,
                    bottom: 5,
                  }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={isMobile ? 10 : 12} />
                  <YAxis
                    dataKey="maturidade"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={isMobile ? 10 : 12}
                    width={isMobile ? 94 : 180}
                    tickFormatter={(value) =>
                      truncateLabel(String(value), isMobile ? 15 : 28)
                    }
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#342ee0",
                      border: "1px solid #0e0a4b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(
                      value: number,
                      _: string,
                      item: { payload?: { respondentes?: number } }
                    ) => [
                      `${value.toFixed(2)} pontos`,
                      `${item.payload?.respondentes ?? 0} respondentes`,
                    ]}
                  />
                  <Bar
                    dataKey="notaMedia"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}

                  >
                    {technicalScoreData.map((_, index) => (
                      <Cell key={`score-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>

            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
