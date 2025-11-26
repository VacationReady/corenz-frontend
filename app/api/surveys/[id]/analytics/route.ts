import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { triggerManualAnalysis } from "@/lib/ai/survey-analyzer";
import { anonymizeEmployeeData, getAnonymizationLevel } from "@/lib/survey-anonymization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get specific survey with detailed analytics
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        Form: {
          select: {
            id: true,
            name: true,
            schema: true,
          },
        },
        SurveyResponses: {
          include: {
            Employee: {
              select: {
                id: true,
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                Department: {
                  select: {
                    name: true,
                  },
                },
                JobRole: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
        SurveyRecipients: {
          include: {
            Employee: {
              select: {
                id: true,
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                Department: {
                  select: {
                    name: true,
                  },
                },
                JobRole: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            SurveyRecipients: true,
            SurveyResponses: true,
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const totalResponses = survey._count.SurveyResponses;
    const totalRecipients = survey._count.SurveyRecipients;
    const responseRate = totalRecipients > 0 ? (totalResponses / totalRecipients) * 100 : 0;

    // Calculate detailed analytics from response data
    let averageScore = survey.averageScore;
    let questionAnalytics: any[] = [];
    let sentimentAnalysis = {
      positive: 0,
      neutral: 0,
      negative: 0,
      overallScore: survey.sentimentScore || 0.5,
    };

    if (survey.SurveyResponses.length > 0) {
      // Parse form schema to get questions
      let questions: any[] = [];
      try {
        const formSchema = survey.Form.schema as any;
        if (formSchema?.fields) {
          questions = formSchema.fields;
        }
      } catch (error) {
        console.error("Error parsing form schema:", error);
      }

      // Calculate average score from response data
      const scores: number[] = [];
      const responseAnalytics: { [key: string]: any } = {};

      survey.SurveyResponses.forEach(response => {
        try {
          const data = response.responseData as any;
          
          // Collect numeric scores
          Object.entries(data || {}).forEach(([key, value]) => {
            if (typeof value === 'number' && value >= 1 && value <= 5) {
              scores.push(value);
              
              if (!responseAnalytics[key]) {
                responseAnalytics[key] = {
                  question: key,
                  responses: [],
                  average: 0,
                  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                };
              }
              
              responseAnalytics[key].responses.push(value);
              const distribution = responseAnalytics[key].distribution;
              if (value >= 1 && value <= 5) {
                distribution[value as keyof typeof distribution]++;
              }
            }
          });
        } catch (error) {
          console.error("Error processing response data:", error);
        }
      });

      // Calculate averages and distributions
      if (scores.length > 0) {
        averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }

      // Process question analytics
      questionAnalytics = Object.values(responseAnalytics).map((q: any) => ({
        question: q.question,
        totalResponses: q.responses.length,
        average: q.responses.length > 0 
          ? Math.round((q.responses.reduce((sum: number, val: number) => sum + val, 0) / q.responses.length) * 10) / 10
          : 0,
        distribution: q.distribution,
      }));

      // Basic sentiment analysis based on scores
      const avgSentiment = averageScore ? (averageScore - 1) / 4 : 0.5; // Convert 1-5 to 0-1
      if (avgSentiment >= 0.7) {
        sentimentAnalysis.positive = Math.round(avgSentiment * 100);
        sentimentAnalysis.neutral = Math.round((1 - avgSentiment) * 50);
        sentimentAnalysis.negative = Math.round((1 - avgSentiment) * 50);
      } else if (avgSentiment >= 0.4) {
        sentimentAnalysis.neutral = 60;
        sentimentAnalysis.positive = Math.round(avgSentiment * 40);
        sentimentAnalysis.negative = Math.round((1 - avgSentiment) * 40);
      } else {
        sentimentAnalysis.negative = Math.round((1 - avgSentiment) * 100);
        sentimentAnalysis.neutral = Math.round(avgSentiment * 50);
        sentimentAnalysis.positive = Math.round(avgSentiment * 50);
      }
      
      sentimentAnalysis.overallScore = avgSentiment;
    }

    // Group responses by department
    const departmentAnalytics: { [key: string]: { responses: number; average: number } } = {};
    survey.SurveyResponses.forEach(response => {
      const dept = response.Employee?.Department?.name || 'Unknown';
      if (!departmentAnalytics[dept]) {
        departmentAnalytics[dept] = { responses: 0, average: 0 };
      }
      departmentAnalytics[dept].responses++;
    });

    // Calculate department averages
    Object.keys(departmentAnalytics).forEach(dept => {
      const deptResponses = survey.SurveyResponses.filter(
        r => (r.Employee?.Department?.name || 'Unknown') === dept
      );
      const deptScores = deptResponses
        .map(r => {
          try {
            const data = r.responseData as any;
            const scores = Object.values(data || {})
              .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 5);
            return scores.length > 0 
              ? scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length 
              : null;
          } catch {
            return null;
          }
        })
        .filter((score): score is number => score !== null);
      
      departmentAnalytics[dept].average = deptScores.length > 0
        ? Math.round((deptScores.reduce((sum, score) => sum + score, 0) / deptScores.length) * 10) / 10
        : 0;
    });

    // Use completion date or latest response date
    const completionDate = survey.status === "COMPLETED" 
      ? (survey.deadline ?? survey.updatedAt)
      : survey.SurveyResponses.length > 0
        ? new Date(Math.max(...survey.SurveyResponses.map(r => new Date(r.submittedAt).getTime())))
        : survey.updatedAt;

    // Get anonymization level from survey metadata
    const anonymizationLevel = getAnonymizationLevel(survey.metadata);

    // For anonymous surveys, we need to shuffle the order to prevent 
    // identification through submission order
    const isAnonymousSurvey = anonymizationLevel !== "public";
    
    // For anonymous surveys, don't show department breakdown with individual response data
    // as this could be used to identify respondents
    const safeQuestionAnalytics = questionAnalytics;
    const safeDepartmentAnalytics = isAnonymousSurvey 
      ? Object.entries(departmentAnalytics)
          // Only include departments with 3+ responses to maintain anonymity
          .filter(([_, data]) => data.responses >= 3)
          .map(([dept, data]) => ({
            department: dept,
            responses: data.responses,
            average: data.average,
          }))
      : Object.entries(departmentAnalytics).map(([dept, data]) => ({
          department: dept,
          responses: data.responses,
          average: data.average,
        }));

    const analytics = {
      id: survey.id,
      name: survey.name,
      templateName: survey.Form.name,
      totalResponses,
      totalRecipients,
      responseRate: Math.round(responseRate * 100) / 100,
      completionDate: completionDate.toISOString(),
      averageScore: averageScore ? Math.round(averageScore * 10) / 10 : undefined,
      keyInsights: survey.keyInsights || [],
      sentimentScore: sentimentAnalysis.overallScore,
      topThemes: survey.topThemes || [],
      questionAnalytics: safeQuestionAnalytics,
      departmentAnalytics: safeDepartmentAnalytics,
      anonymizationLevel, // Include level so frontend knows what to expect
      responses: survey.SurveyResponses.map((response, index) => ({
        id: response.id,
        employee: anonymizeEmployeeData(response.Employee, anonymizationLevel, index, "Respondent"),
        submittedAt: isAnonymousSurvey ? null : response.submittedAt, // Hide submission time for anonymous surveys
        responseData: response.responseData,
      })),
      recipients: survey.SurveyRecipients.map((recipient, index) => ({
        id: recipient.id,
        employee: anonymizeEmployeeData(recipient.Employee, anonymizationLevel, index, "Recipient"),
        status: recipient.status,
        sentAt: isAnonymousSurvey ? null : recipient.sentAt, // Hide sent time for anonymous surveys
      })),
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Error fetching individual survey analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
