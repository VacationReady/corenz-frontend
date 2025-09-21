import { renderPeopleCoreEmail } from "./template";

export interface DocumentNotificationOptions {
  recipientName?: string | null;
  documentName: string;
  category?: string | null;
  docLink: string;
  requiresSignature: boolean;
  signatureDueAt?: Date | string | null;
}

function formatDueDate(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
}

export function buildDocumentNotificationEmail({
  recipientName,
  documentName,
  category,
  docLink,
  requiresSignature,
  signatureDueAt,
}: DocumentNotificationOptions): { subject: string; html: string; text: string } {
  const subject = requiresSignature
    ? "New Document Requires Your Signature"
    : "New Document Requires Your Acknowledgement";

  const formattedDue = formatDueDate(signatureDueAt);
  const safeCategory = category || "General";
  const greetingName = recipientName?.trim() || "there";
  const actionPhrase = requiresSignature ? "signature" : "acknowledgement";
  const buttonLabel = requiresSignature ? "View & Sign Document" : "View Document";

  const { html, text } = renderPeopleCoreEmail({
    preheader: `${documentName} requires your ${actionPhrase}`,
    title: subject,
    intro: [
      `Hi ${greetingName},`,
      `A new document ${documentName} (${safeCategory}) has been uploaded and requires your ${actionPhrase}.`,
    ],
    sections: [
      {
        title: "Document Details",
        description: [
          `Document: ${documentName}`,
          `Category: ${safeCategory}`,
          ...(formattedDue ? [`Due by: ${formattedDue}`] : []),
        ],
      },
    ],
    ctas: {
      label: buttonLabel,
      href: docLink,
    },
    outro: [
      "Thank you,",
      "The PeopleCore Team",
    ],
  });

  return { subject, html, text };
}
