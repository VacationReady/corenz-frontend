import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import {
  AI_CONFIG,
  checkRateLimit,
  isAIEnabled,
  openai,
} from "@/lib/ai/openai-client";

import {
  analyticsFilterSchema,
  getPeopleAnalytics,
  type PeopleAnalyticsResult,
} from "../analytics-service";

const bodySchema = z.object({
  rangeInMonths: z.number().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => ({}));
  const parseResult = bodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const filtersResult = analyticsFilterSchema.safeParse(parseResult.data);
  if (!filtersResult.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: filtersResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const analytics = await getPeopleAnalytics(
      session.user.companyId,
      filtersResult.data,
    );

    const aiAvailable = isAIEnabled();
    let aiInsights: PeopleAnalyticsResult["insights"] = [];
    let aiUsed = false;
    let aiError: string | null = null;

    if (aiAvailable) {
      const rateLimit = checkRateLimit(session.user.id, 20, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            resetAt: new Date(rateLimit.resetAt).toISOString(),
          },
          { status: 429 },
        );
      }

      try {
        const trendWindow = analytics.trend.monthly.slice(
          -Math.min(6, filtersResult.data.rangeInMonths),
        );
        const departmentHighlights = analytics.explorer.datasets.department?.slice(0, 5) ?? [];
        const locationHighlights = analytics.explorer.datasets.location?.slice(0, 5) ?? [];

        const completion = await openai.chat.completions.create({
          model: AI_CONFIG.model,
          temperature: 0.2,
          max_tokens: 900,
          messages: [
            {
              role: "system",
              content:
                "You are an HR analytics strategist specialising in mid-market HRIS programmes. Craft concise, board-ready recommendations.",
            },
            {
              role: "user",
              content: JSON.stringify({
                metrics: analytics.metrics,
                baseInsights: analytics.insights,
                departmentHighlights,
                locationHighlights,
                trendWindow,
              }),
            },
            {
              role: "system",
              content:
                "Return JSON with an `insights` array. Each insight must include title, summary, priority (low|medium|high), and action. Reference the provided metrics when possible.",
            },
          ],
          response_format: { type: "json_object" },
        });

        const aiContent = completion.choices[0]?.message?.content;
        if (aiContent) {
          const parsed = JSON.parse(aiContent) as {
            insights?: {
              title: string;
              summary: string;
              priority?: "low" | "medium" | "high";
              action?: string;
            }[];
          };
          if (Array.isArray(parsed.insights)) {
            aiInsights = parsed.insights.map((insight, index) => ({
              id: `ai-${Date.now()}-${index}`,
              title: insight.title,
              summary: insight.summary,
              priority: insight.priority ?? "medium",
              source: "ai" as const,
              action: insight.action,
            }));
            aiUsed = aiInsights.length > 0;
          }
        }
      } catch (error: any) {
        console.error("[analytics:people] AI insight failure", error);
        aiError = error?.message ?? "Unable to generate AI insights";
      }
    }

    return NextResponse.json({
      heuristics: analytics.insights,
      aiInsights,
      aiUsed,
      aiAvailable,
      aiError,
      metrics: analytics.metrics,
    });
  } catch (error: any) {
    console.error("[analytics:people] insight generation failed", error);
    return NextResponse.json(
      { error: error?.message ?? "Unable to generate insights" },
      { status: 500 },
    );
  }
}

