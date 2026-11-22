import { z } from "zod";

export const AVAILABILITY_OPTIONS = ["Menos de 6 horas semanais", "6 a 8 horas semanais", "9 a 12 horas semanais", "Mais de 12 horas semanais"] as const;
const selections = z.array(z.string().trim().min(1).max(100)).max(30).transform(values => [...new Set(values)]);
export const profileAnswerSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo.").max(180, "Use até 180 caracteres."),
  email: z.string().trim().max(254).email("Informe um e-mail válido."),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]+$/, "Informe um telefone válido.").transform(value => value.replace(/\D/g, "")).refine(value => value.length >= 10 && value.length <= 13, "Informe o telefone com DDD."),
  techs: selections,
  interests: selections,
  additionalTechs: selections.optional(),
  communication: selections.optional(),
  course: z.string().trim().min(2, "Informe seu curso.").max(120, "Use até 120 caracteres."),
  availability: z.enum(AVAILABILITY_OPTIONS, { errorMap: () => ({ message: "Escolha sua disponibilidade semanal." }) }),
  revision: z.string().regex(/^[a-f\d]{64}$/, "Recarregue o formulário antes de enviar."),
  confirmed: z.literal(true, { errorMap: () => ({ message: "Confira e confirme as informações antes de enviar." }) }),
}).strict();

export const progressSchema = z.object({
  course: z.string().trim().max(120),
  availability: z.union([z.literal(""), z.enum(AVAILABILITY_OPTIONS)]),
  techs: selections,
  interests: selections,
  additionalTechs: selections,
  communication: selections,
}).strict();
export type FormProgress = z.infer<typeof progressSchema>;

export type ProfileAnswer = z.infer<typeof profileAnswerSchema>;
export interface PublicMemberProfile {
  name: string;
  email: string;
  phone: string;
  techs: string[];
  interests: string[];
  techOptions: string[];
  interestOptions: string[];
  revision: string;
  course?: string;
  availability?: string;
  additionalTechs?: string[];
  communication?: string[];
  progress?: FormProgress;
}
export interface ProfileFormState {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  reloadRequired?: boolean;
}
