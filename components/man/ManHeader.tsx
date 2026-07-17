import { siteConfig } from "@/lib/site-config";

export function manTitleLine(): string {
  const { name, nameUpper } = siteConfig;
  return `${name}(1)                        ${nameUpper}                         ${name}(1)`;
}

export function ManHeader({ subtitle }: { subtitle?: string }) {
  const { name, tagline } = siteConfig;
  return (
    <pre>{`${manTitleLine()}

NAME
    ${name} — ${tagline}${subtitle ? `\n\n    ${subtitle}` : ""}
`}</pre>
  );
}
