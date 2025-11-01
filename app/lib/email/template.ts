const BRAND = {
  background: "#f6f9fc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  primary: "#0ea5e9",
  primaryDark: "#0284c7",
  accent: "#6366f1",
  accentSoft: "#dbeafe",
  text: "#0f172a",
  muted: "#64748b",
  border: "#d6e0ef",
};

export interface EmailTemplateCTA {
  label: string;
  href: string;
}

export interface EmailTemplateSection {
  title?: string;
  eyebrow?: string;
  description?: string | string[];
  bulletPoints?: string[];
  html?: string;
  text?: string | string[];
  highlight?: boolean;
}

export interface PeopleCoreEmailTemplate {
  preheader?: string;
  title: string;
  heroBadge?: string;
  heroSubtitle?: string;
  intro?: string | string[];
  sections?: EmailTemplateSection[];
  outro?: string | string[];
  ctas?: EmailTemplateCTA | EmailTemplateCTA[];
  footer?: string;
}

const DEFAULT_FOOTER =
  "You're receiving this email because your organisation uses PeopleCore — the New Zealand HR platform. This inbox is not monitored.";

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
  const heroBadge = template.heroBadge;
  const heroSubtitle = template.heroSubtitle ?? preheader;
  const ctaGradient = `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`;
  const heroBackground =
    "linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(99,102,241,0.18) 55%, rgba(168,85,247,0.18) 100%)";
  const containerShadow = "0 35px 65px rgba(15, 23, 42, 0.12)";

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
                `<p style="margin: 0 0 14px 0; color: ${BRAND.text}; font-size: 15px; line-height: 1.7;">${escapeHtml(
                  line,
                )}</p>`,
            )
            .join(""),
        );
      }

      if (points.length) {
        bodyParts.push(
          `<ul style="margin: 0 0 12px 0; padding: 0; list-style: none;">${points
            .map(
              (point) =>
                `<li style="margin: 0 0 12px 0; display: flex; align-items: flex-start; gap: 12px;">
                  <span style="margin-top: 7px; flex-shrink: 0; width: 10px; height: 10px; border-radius: 999px; background: ${BRAND.accent};"></span>
                  <span style="flex: 1; color: ${BRAND.text}; font-size: 15px; line-height: 1.7;">${escapeHtml(
                    point,
                  )}</span>
                </li>`,
            )
            .join("")}</ul>`,
        );
      }

      if (section.html) {
        bodyParts.push(
          `<div style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.7; color: ${BRAND.text};">${section.html}</div>`,
        );
      }

      if (!bodyParts.length) {
        return "";
      }

      const eyebrowHtml = section.eyebrow
        ? `<p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.muted};">${escapeHtml(
            section.eyebrow,
          )}</p>`
        : "";

      const titleHtml = section.title
        ? `<h3 style="margin: 0 0 14px 0; color: ${BRAND.primaryDark}; font-size: 20px;">${escapeHtml(
            section.title,
          )}</h3>`
        : "";

      const highlightBackground =
        "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.12) 100%)";
      const background = section.highlight ? highlightBackground : BRAND.surface;
      const borderColor = section.highlight ? `${BRAND.primary}26` : BRAND.border;
      const shadow = section.highlight
        ? "0 20px 40px rgba(15, 23, 42, 0.12)"
        : "0 12px 28px rgba(15, 23, 42, 0.06)";

      return `<table role="presentation" width="100%" style="margin: 0 0 20px 0; border-collapse: separate; border-spacing: 0;">
        <tr>
          <td style="padding: 24px 28px; border-radius: 20px; background: ${background}; border: 1px solid ${borderColor}; box-shadow: ${shadow};">
            ${eyebrowHtml}${titleHtml}${bodyParts.join("")}
          </td>
        </tr>
      </table>`;
    })
    .filter(Boolean)
    .join("");

  const ctaHtml = ctas
    .map((cta, index) => {
      const isPrimary = index === 0;
      const backgroundColor = isPrimary ? BRAND.primary : BRAND.surfaceMuted;
      const backgroundImage = isPrimary ? ctaGradient : "none";
      const color = isPrimary ? "#ffffff" : BRAND.primaryDark;
      const border = isPrimary ? "none" : `1px solid ${BRAND.border}`;
      const shadow = isPrimary
        ? "box-shadow: 0 15px 30px rgba(14, 165, 233, 0.35);"
        : "box-shadow: none;";
      return `<a href="${cta.href}" style="display:inline-block; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 16px; text-decoration: none; margin: 0 12px 12px 0; background-color: ${backgroundColor}; background-image: ${backgroundImage}; color: ${color}; border: ${border}; ${shadow}">${escapeHtml(
        cta.label,
      )}</a>`;
    })
    .join("");

  const introHtml = intro
    .map(
      (line) =>
        `<p style="margin: 0 0 18px 0; font-size: 17px; line-height: 1.75; color: ${BRAND.text};">${escapeHtml(
          line,
        )}</p>`,
    )
    .join("");

  const sectionBlock = sectionHtml
    ? `<div style="margin: ${intro.length ? "28px 0 0" : "0"};">${sectionHtml}</div>`
    : "";

  const ctaBlock = ctaHtml
    ? `<div style="margin: ${sectionHtml ? "28px 0 16px" : "24px 0 16px"};">${ctaHtml}</div>`
    : "";

  const outroHtml = outro
    .map(
      (line) =>
        `<p style="margin: 0 0 14px 0; color: ${BRAND.muted}; font-size: 14px; line-height: 1.7;">${escapeHtml(
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
  <body style="margin:0; padding:0; background-color:${BRAND.background}; background-image: radial-gradient(circle at top left, rgba(99,102,241,0.18), rgba(255,255,255,0) 55%), radial-gradient(circle at bottom right, rgba(14,165,233,0.18), rgba(255,255,255,0) 60%); font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color:${BRAND.text};">
    <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">${escapeHtml(
      preheader,
    )}</span>
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="width:100%; background-color:transparent; padding: 48px 16px;">
      <tr>
        <td align="center" style="width: 100%;">
          <table role="presentation" width="100%" style="max-width:680px; background:${BRAND.surface}; border-radius:28px; box-shadow:${containerShadow}; overflow:hidden; border:1px solid ${BRAND.border};">
            <tr>
              <td style="padding: 40px 40px 36px; background: ${heroBackground}; border-bottom: 1px solid ${BRAND.border};">
                <table role="presentation" width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td align="left" style="vertical-align: top;">
                      <img src="${logoUrl}" alt="PeopleCore" style="height: 32px; width: auto; display: block; margin-bottom: 18px;" />
                      ${
                        heroBadge
                          ? `<span style="display:inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,0.28); color: ${BRAND.primaryDark}; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px;">${escapeHtml(
                              heroBadge,
                            )}</span>`
                          : ""
                      }
                      <h1 style="margin: 0; font-size: 28px; line-height: 1.25; color: ${BRAND.text};">${escapeHtml(
                        template.title,
                      )}</h1>
                      ${
                        heroSubtitle
                          ? `<p style="margin: 12px 0 0 0; font-size: 16px; line-height: 1.7; color: ${BRAND.muted}; max-width: 520px;">${escapeHtml(
                              heroSubtitle,
                            )}</p>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 40px 32px; background:${BRAND.surface};">
                ${introHtml}
                ${sectionBlock}
                ${ctaBlock}
                ${outroHtml}
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.surfaceMuted}; padding: 24px 32px; text-align: center; border-top: 1px solid ${BRAND.border};">
                <p style="margin:0; font-size:12px; color:${BRAND.muted}; line-height:1.6;">${escapeHtml(
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

  const textParts: string[] = [];
  textParts.push(template.title.toUpperCase());
  if (heroBadge) {
    textParts.push(heroBadge.toUpperCase());
  }
  if (heroSubtitle && heroSubtitle !== template.title) {
    textParts.push(heroSubtitle);
  }
  textParts.push("");
  textParts.push(preheader);
  textParts.push("");

  if (intro.length) {
    textParts.push(...intro);
    textParts.push("");
  }

  if (textSections.length) {
    for (const block of textSections) {
      textParts.push(block);
      textParts.push("");
    }
  }

  if (outro.length) {
    textParts.push(...outro);
    textParts.push("");
  }

  if (textCtas.length) {
    textParts.push(...textCtas);
    textParts.push("");
  }

  while (textParts.length > 0 && textParts[textParts.length - 1] === "") {
    textParts.pop();
  }
  textParts.push("");
  textParts.push(footer);

  const text = textParts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}
