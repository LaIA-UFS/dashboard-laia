export const NOTION_SOURCES = {
  members: "c76c2a81-2d02-82e1-9e14-072202690361",
  projects: "41ec2a81-2d02-81bc-992b-000b3491641f",
} as const;

export function getNotionConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    token: env.NOTION_TOKEN?.trim() || "",
    members: env.NOTION_MEMBERS_DATA_SOURCE_ID?.trim() || NOTION_SOURCES.members,
    projects: env.NOTION_PROJECTS_DATA_SOURCE_ID?.trim() || NOTION_SOURCES.projects,
  };
}
