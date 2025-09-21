const BRAND = {
  background: "#f1f5f9",
  surface: "#ffffff",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  text: "#0f172a",
  muted: "#475569",
  border: "#e2e8f0",
};

export interface EmailTemplateCTA {
  label: string;
  href: string;
}

export interface EmailTemplateSection {
  title?: string;
  description?: string | string[];
  bulletPoints?: string[];
  html?: string;
  text?: string | string[];
}

export interface PeopleCoreEmailTemplate {
  preheader?: string;
  title: string;
  intro?: string | string[];
  sections?: EmailTemplateSection[];
  outro?: string | string[];
  ctas?: EmailTemplateCTA | EmailTemplateCTA[];
  footer?: string;
}

const DEFAULT_FOOTER =
  "You're receiving this message because your organisation uses PeopleCore. This inbox is unattended.";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function normaliseLines(value?: string | string[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function normaliseCTA(cta?: EmailTemplateCTA | EmailTemplateCTA[]): EmailTemplateCTA[] {
  if (!cta) return [];
  return Array.isArray(cta) ? cta : [cta];
}

function getLogoUrl(): string {
  const explicit = process.env.PEOPLECORE_LOGO_URL;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "";

  const trimmedBase = base ? base.replace(/\/$/, "") : "";
  if (explicit) return explicit;
  if (trimmedBase) return `${trimmedBase}/peoplecore-logo.svg`;
  return "https://peoplecore.vercel.app/peoplecore-logo.svg";
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "https://peoplecore.vercel.app"
  );
}

export function renderPeopleCoreEmail(
  template: PeopleCoreEmailTemplate,
): { html: string; text: string } {
  const preheader =
    template.preheader || normaliseLines(template.intro)[0] || template.title;
  const intro = normaliseLines(template.intro);
  const outro = normaliseLines(template.outro);
  const ctas = normaliseCTA(template.ctas);
  const sections = template.sections ?? [];
  const footer = template.footer || DEFAULT_FOOTER;
  const logoUrl = getLogoUrl();

  const sectionHtml = sections
    .map((section) => {
      const description = normaliseLines(section.description);
      const points = section.bulletPoints ?? [];
      const bodyParts: string[] = [];

      if (description.length) {
        bodyParts.push(
          description
            .map(
              (line) =>
                `<p style="margin: 0 0 12px 0; color: ${BRAND.text}; font-size: 15px; line-height: 1.6;">${escapeHtml(
                  line,
                )}</p>`,
            )
            .join(""),
        );
      }

      if (points.length) {
        bodyParts.push(
          `<ul style="margin: 0 0 12px 0; padding-left: 20px; color: ${BRAND.text}; font-size: 15px; line-height: 1.6;">${points
            .map(
              (point) =>
                `<li style=\"margin-bottom: 6px;\">${escapeHtml(point)}</li>`,
            )
            .join("")}</ul>`,
        );
      }

      if (section.html) {
        bodyParts.push(
          `<div style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: ${BRAND.text};">${section.html}</div>`,
        );
      }

      if (!bodyParts.length) {
        return "";
      }

      const titleHtml = section.title
        ? `<h3 style="margin: 0 0 12px 0; color: ${BRAND.primary}; font-size: 18px;">${escapeHtml(
            section.title,
          )}</h3>`
        : "";

      return `<section style="padding: 20px; border: 1px solid ${BRAND.border}; border-radius: 16px; background: ${BRAND.surface}; margin-bottom: 16px;">${titleHtml}${bodyParts.join(
        "",
      )}</section>`;
    })
    .filter(Boolean)
    .join("");

  const ctaHtml = ctas
    .map(
      (cta) =>
        `<a href="${cta.href}" style="display: inline-block; background: ${BRAND.primary}; color: #ffffff; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 16px; text-decoration: none; margin: 0 8px 12px 0;">${escapeHtml(
          cta.label,
        )}</a>`,
    )
    .join("");

  const outroHtml = outro
    .map(
      (line) =>
        `<p style="margin: 0 0 12px 0; color: ${BRAND.muted}; font-size: 14px; line-height: 1.6;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(template.title)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.background}; font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color:${BRAND.text};">
    <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">${escapeHtml(
      preheader,
    )}</span>
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background-color:${BRAND.background}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:640px; background:${BRAND.surface}; border-radius:24px; box-shadow:0 20px 45px rgba(15, 23, 42, 0.08); overflow:hidden; border:1px solid ${BRAND.border};">
            <tr>
              <td style="background: linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.12) 100%); padding: 28px 32px; text-align:left;">
                <img src="${logoUrl}" alt="PeopleCore" style="height: 32px; width: auto; display: block; margin-bottom: 16px;" />
                <h1 style="margin: 0; font-size: 26px; line-height: 1.2; color: ${BRAND.text};">${escapeHtml(
                  template.title,
                )}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                ${intro
                  .map(
                    (line) =>
                      `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; color: ${BRAND.text};">${escapeHtml(
                        line,
                      )}</p>`,
                  )
                  .join("")}
                ${sectionHtml}
                ${ctaHtml ? `<div style="margin: 24px 0;">${ctaHtml}</div>` : ""}
                ${outroHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:${BRAND.background}; padding: 20px 32px; text-align: center; border-top: 1px solid ${BRAND.border};">
                <p style="margin:0; font-size:12px; color:${BRAND.muted}; line-height:1.5;">${escapeHtml(
                  footer,
                )}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textSections = sections
    .map((section) => {
      const lines: string[] = [];
      const description = normaliseLines(section.description);
      const textLines = normaliseLines(section.text);

      if (section.title) {
        lines.push(section.title.toUpperCase());
      }
      if (textLines.length) {
        lines.push(...textLines);
      } else {
        if (description.length) {
          lines.push(...description);
        }
        if (section.bulletPoints?.length) {
          lines.push(...section.bulletPoints.map((point) => `- ${point}`));
        }
      }
      return lines.join("\n");
    })
    .filter(Boolean);

  const textCtas = ctas.map((cta) => `${cta.label}: ${cta.href}`);

  const text = [
    template.title.toUpperCase(),
    "",
    preheader,
    "",
    ...intro,
    "",
    ...textSections.flatMap((block) => [block, ""]),
    ...outro,
    ...(textCtas.length ? ["", ...textCtas] : []),
    "",
    footer,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}
