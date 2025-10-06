/**
 * Survey Response Analyzer - AI-powered analysis of survey responses
 * Generates insights, themes, and sentiment analysis using OpenAI
 */

import { openai, AI_CONFIG } from "./openai-client";
import { prisma } from "@/lib/prisma";

export interface SurveyAnalysisResult {
  keyInsights: string[];
  topThemes: string[];
  sentimentScore: number;
  averageScore?: number;
  departmentBreakdown: {
    [department: string]: {
      averageScore: number;
      sentimentScore: number;
      keyInsights: string[];
    };
  };
  recommendations: string[];
  riskFactors: string[];
  positiveHighlights: string[];
}

export interface ResponseData {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  responseData: any;
  submittedAt: string;
}

/**
 * Main function to analyze survey responses using AI
 */
export async function analyzeSurveyResponses(
  surveyId: string,
  responses: ResponseData[]
): Promise<SurveyAnalysisResult> {
  try {
    console.log(`🤖 Starting AI analysis for survey ${surveyId} with ${responses.length} responses`);

    if (responses.length === 0) {
      return getEmptyAnalysisResult();
    }

    // Prepare data for AI analysis
    const analysisData = prepareAnalysisData(responses);
    
    // Perform AI analysis
    const aiAnalysis = await performAIAnalysis(analysisData, responses.length);
    
    // Calculate statistical metrics
    const statsAnalysis = calculateStatisticalMetrics(responses);
    
    // Combine AI and statistical analysis
    const combinedResult = combineAnalysisResults(aiAnalysis, statsAnalysis, responses);
    
    // Update survey record with analysis results
    await updateSurveyAnalysis(surveyId, combinedResult);
    
    console.log(`✅ AI analysis completed for survey ${surveyId}`);
    return combinedResult;
    
  } catch (error) {
    console.error("❌ Error in AI survey analysis:", error);
    
    // Fallback to basic statistical analysis
    const fallbackResult = calculateStatisticalMetrics(responses);
    await updateSurveyAnalysis(surveyId, fallbackResult);
    
    return fallbackResult;
  }
}

/**
 * Prepare structured data for AI analysis
 */
function prepareAnalysisData(responses: ResponseData[]): string {
  const data = responses.map(response => {
    const responseText = extractTextFromResponse(response.responseData);
    return {
      employee: `${response.employeeName} (${response.department})`,
      responses: responseText,
      department: response.department,
      submittedAt: response.submittedAt
    };
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Extract text content from response data
 */
function extractTextFromResponse(responseData: any): string {
  if (!responseData) return "";
  
  const textParts: string[] = [];
  
  Object.entries(responseData).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      textParts.push(`${key}: ${value}`);
    } else if (typeof value === 'number' && value >= 1 && value <= 5) {
      textParts.push(`${key}: ${value}/5`);
    }
  });
  
  return textParts.join('; ');
}

/**
 * Perform AI analysis using OpenAI
 */
async function performAIAnalysis(analysisData: string, responseCount: number): Promise<Partial<SurveyAnalysisResult>> {
  const prompt = buildAnalysisPrompt(analysisData, responseCount);
  
  try {
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: "system",
          content: `You are an expert HR analyst specializing in employee survey analysis. Your task is to analyze survey responses and provide actionable insights for leadership.

Key responsibilities:
- Extract meaningful themes and patterns from employee feedback
- Identify key insights that drive business decisions
- Assess sentiment and engagement levels
- Provide specific, actionable recommendations
- Highlight risks and opportunities
- Be concise but comprehensive

Always respond with valid JSON format.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Parse AI response
    const aiResult = JSON.parse(response);
    return {
      keyInsights: aiResult.keyInsights || [],
      topThemes: aiResult.topThemes || [],
      recommendations: aiResult.recommendations || [],
      riskFactors: aiResult.riskFactors || [],
      positiveHighlights: aiResult.positiveHighlights || [],
    };
    
  } catch (error) {
    console.error("Error in OpenAI analysis:", error);
    throw error;
  }
}

/**
 * Build the analysis prompt for OpenAI
 */
function buildAnalysisPrompt(analysisData: string, responseCount: number): string {
  return `
Analyze the following employee survey responses and provide comprehensive insights:

**Survey Data:**
${analysisData}

**Response Count:** ${responseCount} employees

**Instructions:**
1. **Key Insights (3-5 items):** Identify the most important findings that leadership should know
2. **Top Themes (3-5 items):** Extract recurring themes or topics from responses
3. **Recommendations (3-5 items):** Provide specific, actionable recommendations
4. **Risk Factors (1-3 items):** Identify potential issues that need attention
5. **Positive Highlights (2-3 items):** Highlight positive feedback and strengths

**Response Format (JSON):**
{
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "topThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "riskFactors": ["Risk 1", "Risk 2"],
  "positiveHighlights": ["Highlight 1", "Highlight 2"]
}

**Guidelines:**
- Be specific and actionable
- Focus on business impact
- Consider employee sentiment
- Prioritize the most important findings
- Use clear, professional language
- Keep each item concise (1-2 sentences max)
`;
}

/**
 * Calculate statistical metrics from responses
 */
function calculateStatisticalMetrics(responses: ResponseData[]): SurveyAnalysisResult {
  const scores: number[] = [];
  const departmentStats: { [key: string]: { scores: number[], responses: ResponseData[] } } = {};
  
  // Process responses
  responses.forEach(response => {
    const responseScores = extractNumericScores(response.responseData);
    scores.push(...responseScores);
    
    if (!departmentStats[response.department]) {
      departmentStats[response.department] = { scores: [], responses: [] };
    }
    departmentStats[response.department].scores.push(...responseScores);
    departmentStats[response.department].responses.push(response);
  });
  
  // Calculate overall metrics
  const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const sentimentScore = calculateSentimentFromScores(scores);
  
  // Calculate department breakdown
  const departmentBreakdown: { [department: string]: any } = {};
  Object.entries(departmentStats).forEach(([dept, stats]) => {
    const deptAvgScore = stats.scores.length > 0 
      ? stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length 
      : 0;
    const deptSentiment = calculateSentimentFromScores(stats.scores);
    
    departmentBreakdown[dept] = {
      averageScore: Math.round(deptAvgScore * 10) / 10,
      sentimentScore: deptSentiment,
      keyInsights: generateDepartmentInsights(stats.responses, deptAvgScore)
    };
  });
  
  return {
    keyInsights: generateBasicInsights(averageScore, responses.length),
    topThemes: generateBasicThemes(responses),
    sentimentScore,
    averageScore: Math.round(averageScore * 10) / 10,
    departmentBreakdown,
    recommendations: generateBasicRecommendations(averageScore, sentimentScore),
    riskFactors: generateRiskFactors(averageScore, sentimentScore),
    positiveHighlights: generatePositiveHighlights(averageScore, responses.length)
  };
}

/**
 * Extract numeric scores from response data
 */
function extractNumericScores(responseData: any): number[] {
  if (!responseData) return [];
  
  const scores: number[] = [];
  Object.values(responseData).forEach(value => {
    if (typeof value === 'number' && value >= 1 && value <= 5) {
      scores.push(value);
    }
  });
  
  return scores;
}

/**
 * Calculate sentiment score from numeric ratings
 */
function calculateSentimentFromScores(scores: number[]): number {
  if (scores.length === 0) return 0.5;
  
  // Convert 1-5 scale to 0-1 sentiment scale
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.max(0, Math.min(1, (avgScore - 1) / 4));
}

/**
 * Generate basic insights when AI analysis fails
 */
function generateBasicInsights(averageScore: number, responseCount: number): string[] {
  const insights: string[] = [];
  
  if (averageScore >= 4.0) {
    insights.push("High satisfaction levels indicate strong employee engagement");
  } else if (averageScore >= 3.0) {
    insights.push("Moderate satisfaction levels suggest areas for improvement");
  } else {
    insights.push("Low satisfaction scores indicate urgent attention needed");
  }
  
  if (responseCount >= 20) {
    insights.push("Strong response rate provides reliable data for decision-making");
  } else {
    insights.push("Consider increasing response rate for more representative data");
  }
  
  insights.push("Regular pulse surveys help track engagement trends over time");
  
  return insights;
}

/**
 * Generate basic themes from response data
 */
function generateBasicThemes(responses: ResponseData[]): string[] {
  const themes = new Set<string>();
  
  responses.forEach(response => {
    Object.keys(response.responseData || {}).forEach(key => {
      if (key.toLowerCase().includes('satisfaction')) themes.add('Job Satisfaction');
      if (key.toLowerCase().includes('workload')) themes.add('Workload Management');
      if (key.toLowerCase().includes('communication')) themes.add('Communication');
      if (key.toLowerCase().includes('leadership')) themes.add('Leadership');
      if (key.toLowerCase().includes('culture')) themes.add('Company Culture');
      if (key.toLowerCase().includes('growth')) themes.add('Career Development');
    });
  });
  
  return Array.from(themes).slice(0, 5);
}

/**
 * Generate basic recommendations
 */
function generateBasicRecommendations(averageScore: number, sentimentScore: number): string[] {
  const recommendations: string[] = [];
  
  if (averageScore < 3.5) {
    recommendations.push("Implement immediate action plans to address low satisfaction scores");
    recommendations.push("Conduct follow-up interviews with employees to understand specific concerns");
  }
  
  if (sentimentScore < 0.6) {
    recommendations.push("Focus on improving workplace communication and transparency");
    recommendations.push("Consider implementing team-building activities to boost morale");
  }
  
  recommendations.push("Schedule regular check-ins to monitor progress on identified issues");
  recommendations.push("Share survey results with employees and communicate action plans");
  
  return recommendations;
}

/**
 * Generate risk factors
 */
function generateRiskFactors(averageScore: number, sentimentScore: number): string[] {
  const risks: string[] = [];
  
  if (averageScore < 3.0) {
    risks.push("Low satisfaction scores may lead to increased turnover");
  }
  
  if (sentimentScore < 0.5) {
    risks.push("Negative sentiment could impact productivity and collaboration");
  }
  
  if (averageScore < 3.5 && sentimentScore < 0.6) {
    risks.push("Combined low satisfaction and sentiment may affect retention");
  }
  
  return risks;
}

/**
 * Generate positive highlights
 */
function generatePositiveHighlights(averageScore: number, responseCount: number): string[] {
  const highlights: string[] = [];
  
  if (averageScore >= 4.0) {
    highlights.push("Excellent satisfaction scores demonstrate strong employee engagement");
  }
  
  if (responseCount >= 15) {
    highlights.push("High participation rate shows employees value providing feedback");
  }
  
  if (averageScore >= 3.5) {
    highlights.push("Positive ratings indicate effective leadership and workplace culture");
  }
  
  return highlights;
}

/**
 * Generate department-specific insights
 */
function generateDepartmentInsights(responses: ResponseData[], avgScore: number): string[] {
  const insights: string[] = [];
  
  if (avgScore >= 4.0) {
    insights.push("This department shows exceptional satisfaction levels");
  } else if (avgScore >= 3.0) {
    insights.push("Department satisfaction is within acceptable range with room for improvement");
  } else {
    insights.push("Department satisfaction needs immediate attention and support");
  }
  
  insights.push(`${responses.length} employees participated in this survey`);
  
  return insights;
}

/**
 * Combine AI analysis with statistical analysis
 */
function combineAnalysisResults(
  aiAnalysis: Partial<SurveyAnalysisResult>,
  statsAnalysis: SurveyAnalysisResult,
  responses: ResponseData[]
): SurveyAnalysisResult {
  return {
    keyInsights: aiAnalysis.keyInsights?.length ? aiAnalysis.keyInsights : statsAnalysis.keyInsights,
    topThemes: aiAnalysis.topThemes?.length ? aiAnalysis.topThemes : statsAnalysis.topThemes,
    sentimentScore: statsAnalysis.sentimentScore,
    averageScore: statsAnalysis.averageScore,
    departmentBreakdown: statsAnalysis.departmentBreakdown,
    recommendations: aiAnalysis.recommendations?.length ? aiAnalysis.recommendations : statsAnalysis.recommendations,
    riskFactors: aiAnalysis.riskFactors?.length ? aiAnalysis.riskFactors : statsAnalysis.riskFactors,
    positiveHighlights: aiAnalysis.positiveHighlights?.length ? aiAnalysis.positiveHighlights : statsAnalysis.positiveHighlights
  };
}

/**
 * Update survey record with analysis results
 */
async function updateSurveyAnalysis(surveyId: string, analysis: SurveyAnalysisResult): Promise<void> {
  try {
    await prisma.survey.update({
      where: { id: surveyId },
      data: {
        keyInsights: analysis.keyInsights,
        topThemes: analysis.topThemes,
        sentimentScore: analysis.sentimentScore,
        averageScore: analysis.averageScore,
        updatedAt: new Date()
      }
    });
    
    console.log(`📊 Updated survey ${surveyId} with analysis results`);
  } catch (error) {
    console.error("Error updating survey analysis:", error);
    throw error;
  }
}

/**
 * Get empty analysis result for surveys with no responses
 */
function getEmptyAnalysisResult(): SurveyAnalysisResult {
  return {
    keyInsights: ["No responses available for analysis"],
    topThemes: [],
    sentimentScore: 0.5,
    averageScore: 0,
    departmentBreakdown: {},
    recommendations: ["Encourage employee participation in future surveys"],
    riskFactors: ["Low participation may indicate engagement issues"],
    positiveHighlights: ["Survey system is ready for future feedback collection"]
  };
}

/**
 * Analyze individual survey response (for real-time analysis)
 */
export async function analyzeIndividualResponse(
  surveyId: string,
  response: ResponseData
): Promise<void> {
  try {
    // Get all responses for the survey
    const allResponses = await getSurveyResponses(surveyId);
    
    // Add the new response
    allResponses.push(response);
    
    // Re-analyze the entire survey
    await analyzeSurveyResponses(surveyId, allResponses);
    
  } catch (error) {
    console.error("Error analyzing individual response:", error);
  }
}

/**
 * Get all responses for a survey
 */
async function getSurveyResponses(surveyId: string): Promise<ResponseData[]> {
  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId },
    include: {
      Employee: {
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          Department: {
            select: { name: true }
          },
          JobRole: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { submittedAt: 'asc' }
  });

  return responses.map(response => ({
    employeeId: response.employeeId,
    employeeName: `${response.Employee.User.firstName} ${response.Employee.User.lastName}`,
    department: response.Employee.Department?.name || 'Unknown',
    position: response.Employee.JobRole?.name || 'Unknown',
    responseData: response.responseData,
    submittedAt: response.submittedAt.toISOString()
  }));
}

/**
 * Trigger manual analysis for existing surveys
 */
export async function triggerManualAnalysis(surveyId: string): Promise<SurveyAnalysisResult> {
  try {
    const responses = await getSurveyResponses(surveyId);
    return await analyzeSurveyResponses(surveyId, responses);
  } catch (error) {
    console.error("Error in manual analysis:", error);
    throw error;
  }
}
