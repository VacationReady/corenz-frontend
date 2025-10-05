import { renderPeopleCoreEmail } from "./renderPeopleCoreEmail";
import { sendEmail } from "./sendEmail";

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

  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Survey Results Digest</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${name}</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${message ? `
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e293b; font-style: italic;">"${message}"</p>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📊 Key Metrics</h2>
          
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
        </div>

        ${keyInsights.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">🔍 Key Insights</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${keyInsights.map(insight => `
                <li style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">
                  <span style="color: #3b82f6; margin-right: 8px;">•</span>${insight}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${topThemes.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">🏷️ Top Themes</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${topThemes.map(theme => `
                <span style="background: #e0e7ff; color: #3730a3; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">${theme}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            Survey Template: <strong>${templateName}</strong><br>
            Completed: <strong>${new Date(completionDate).toLocaleDateString()}</strong>
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            This digest was generated automatically by PeopleCore Survey Analytics
          </p>
        </div>
      </div>
    </div>
  `;

  // Send email to each recipient
  for (const recipient of recipients) {
    try {
      const htmlContent = renderPeopleCoreEmail({
        content: emailContent,
        previewText: `Survey results for "${name}" - ${responseRate}% response rate`,
      });

      await sendEmail({
        to: recipient.email,
        subject: `📊 Survey Results: ${name}`,
        html: htmlContent,
        attachments: [
          {
            filename: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv`,
            content: csvData,
            contentType: 'text/csv',
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
