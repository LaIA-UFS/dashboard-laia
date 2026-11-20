export const NOTION_SOURCES = {
  members: "0b97067d-e5d1-82c3-bd2a-07c4afbb8b3b",
  projects: "cce7067d-e5d1-83f5-b85f-8747b04b0243",
} as const;

export function getNotionConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    token: env.NOTION_TOKEN?.trim() || "",
    members: env.NOTION_MEMBERS_DATA_SOURCE_ID?.trim() || NOTION_SOURCES.members,
    projects: env.NOTION_PROJECTS_DATA_SOURCE_ID?.trim() || NOTION_SOURCES.projects,
  };
}
