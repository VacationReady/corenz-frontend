import { renderPeopleCoreEmail } from "./template";
import { resend } from "@/lib/resend";

interface SurveyAnalytics {
  id: string;
  name: string;
  templateName: string;
  totalResponses: number;
  responseRate: number;
  averageScore?: number;
  keyInsights: string[];
  sentimentScore: number;
  topThemes: string[];
  completionDate: Date;
}

interface EmailRecipient {
  email: string;
  name: string;
}

interface SendSurveyDigestParams {
  surveyAnalytics: SurveyAnalytics;
  recipients: EmailRecipient[];
  message?: string;
}

export async function sendSurveyDigest({
  surveyAnalytics,
  recipients,
  message,
}: SendSurveyDigestParams) {
  const {
    name,
    templateName,
    totalResponses,
    responseRate,
    averageScore,
    keyInsights,
    sentimentScore,
    topThemes,
    completionDate,
  } = surveyAnalytics;

  // Generate CSV data for attachment
  const csvData = generateSurveyCSV(surveyAnalytics);

  // Determine sentiment label
  const getSentimentLabel = (score: number) => {
    if (score >= 0.7) return "Positive";
    if (score >= 0.4) return "Neutral";
    return "Negative";
  };

  const sentimentLabel = getSentimentLabel(sentimentScore);
  const sentimentColor = sentimentScore >= 0.7 ? "#10b981" : sentimentScore >= 0.4 ? "#f59e0b" : "#ef4444";

  const keyMetricsHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; margin-bottom: 20px;">
      <div style="text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalResponses}</div>
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total Responses</div>
      </div>
      
      <div style="text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${responseRate}%</div>
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Response Rate</div>
      </div>
      
      ${averageScore ? `
        <div style="text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${averageScore}/5.0</div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Average Score</div>
        </div>
      ` : ''}
      
      <div style="text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px;">
        <div style="font-size: 18px; font-weight: bold; color: ${sentimentColor};">${sentimentLabel}</div>
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Overall Sentiment</div>
      </div>
    </div>
  `;

  const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";

  // Build email sections
  const sections = [];

  // Add message if provided
  if (message) {
    sections.push({
      description: `"${message}"`,
    });
  }

  // Key metrics section
  sections.push({
    title: "📊 Key Metrics",
    html: keyMetricsHtml,
    text: [
      `Total Responses: ${totalResponses}`,
      `Response Rate: ${responseRate}%`,
      ...(averageScore ? [`Average Score: ${averageScore}/5.0`] : []),
      `Overall Sentiment: ${sentimentLabel}`,
    ],
  });

  // Key insights section
  if (keyInsights.length > 0) {
    sections.push({
      title: "🔍 Key Insights",
      bulletPoints: keyInsights,
    });
  }

  // Top themes section
  if (topThemes.length > 0) {
    sections.push({
      title: "🏷️ Top Themes",
      description: topThemes.join(", "),
    });
  }

  // Survey details section
  sections.push({
    title: "Survey Details",
    description: [
      `Template: ${templateName}`,
      `Completed: ${new Date(completionDate).toLocaleDateString()}`,
    ],
  });

  // Send email to each recipient
  for (const recipient of recipients) {
    try {
      const { html, text } = renderPeopleCoreEmail({
        preheader: `Survey results for "${name}" - ${responseRate}% response rate`,
        title: `Survey Results: ${name}`,
        intro: [
          `Hi ${recipient.name},`,
          `Here are the results from the "${name}" survey.`,
        ],
        sections,
        outro: [
          "This digest was generated automatically by PeopleCore Survey Analytics.",
          "Thank you,",
          "The PeopleCore Team",
        ],
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject: `📊 Survey Results: ${name}`,
        html,
        text,
        attachments: [
          {
            filename: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv`,
            content: Buffer.from(csvData),
          },
        ],
      });
    } catch (error) {
      console.error(`Failed to send digest to ${recipient.email}:`, error);
      throw error;
    }
  }
}

function generateSurveyCSV(analytics: SurveyAnalytics): string {
  const {
    name,
    templateName,
    totalResponses,
    responseRate,
    averageScore,
    keyInsights,
    sentimentScore,
    topThemes,
    completionDate,
  } = analytics;

  const csvRows = [
    ['Survey Name', name],
    ['Template', templateName],
    ['Total Responses', totalResponses.toString()],
    ['Response Rate', `${responseRate}%`],
    ['Average Score', averageScore ? averageScore.toString() : 'N/A'],
    ['Sentiment Score', `${(sentimentScore * 100).toFixed(0)}%`],
    ['Completion Date', new Date(completionDate).toLocaleDateString()],
    [''],
    ['Key Insights'],
    ...keyInsights.map(insight => ['', insight]),
    [''],
    ['Top Themes'],
    ...topThemes.map(theme => ['', theme]),
  ];

  return csvRows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}
