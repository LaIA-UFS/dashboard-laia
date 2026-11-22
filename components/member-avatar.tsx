"use client";

import Image from "next/image";
import { useState } from "react";
import { getMemberPhoto } from "@/lib/member-media";
import type { Member } from "@/lib/types";

export function MemberAvatar({ member, className = "size-10", portrait = false, sizes = "40px" }: {
  member: Pick<Member, "nome" | "nomeOriginal" | "notionId">; className?: string; portrait?: boolean; sizes?: string;
}) {
  const src = getMemberPhoto(member, portrait ? "profile" : "thumbnail");
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = member.nome.trim().split(/\s+/).filter(Boolean).filter((_, i, parts) => i === 0 || i === parts.length - 1).map(part => part[0]).join("");
  return <div className={`relative shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-primary/10 ${className}`}>
    {src !== "/placeholder-user.jpg" && failedSrc !== src ? <Image src={src} alt={`Foto de ${member.nome}`} fill sizes={sizes} className="object-cover object-[center_28%]" onError={() => setFailedSrc(src)} /> : <span role="img" aria-label={`Foto não disponível de ${member.nome}`} className="absolute inset-0 flex items-center justify-center text-base font-semibold text-violet-200">{initials}</span>}
  </div>;
}
