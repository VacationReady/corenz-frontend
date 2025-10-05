import { AnyFormSchema } from "@/api/forms/[id]/types";

export interface SurveyTemplateDefinition {
  name: string;
  slug: string;
  description: string;
  emoji: string;
  accentColor: string;
  accentGradient: string;
  highlights: string[];
  schema: AnyFormSchema;
}

export const DEFAULT_SURVEY_TEMPLATES: SurveyTemplateDefinition[] = [
  {
    name: "Employee Net Promoter Score (eNPS)",
    slug: "employee-net-promoter-score",
    description:
      "Measure employee loyalty with a quick, industry-standard 0-10 promoter score and gather context on the rating.",
    emoji: "📈",
    accentColor: "text-blue-600",
    accentGradient: "from-blue-500/90 via-indigo-500/90 to-sky-500/80",
    highlights: ["0-10 promoter scale", "Follow-up sentiment", "Actionable improvement ideas"],
    schema: {
      version: 2,
      sections: [
        {
          id: "enps-core-insight",
          title: "Promoter Score",
          description:
            "Help us understand how likely you are to recommend working at our company to friends or colleagues.",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "enps-score",
              type: "chips",
              label: "How likely are you to recommend working here to a friend?",
              required: true,
              helpText: "0 = Not at all likely, 10 = Extremely likely",
              appearance: "buttons",
              optionItems: Array.from({ length: 11 }, (_, index) => ({
                label: `${index}`,
                value: String(index),
              })),
              validation: {
                required: true,
              },
            },
            {
              id: "enps-driver",
              type: "textarea",
              label: "What is the primary reason for your score?",
              placeholder: "Share the context behind your rating...",
              required: false,
              helpText: "This helps us celebrate wins and address friction points.",
            },
            {
              id: "enps-improvement",
              type: "textarea",
              label: "What is one thing we could do to improve your experience?",
              placeholder: "Tell us what would move your score closer to a 10...",
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    name: "Weekly Pulse Survey",
    slug: "weekly-pulse-survey",
    description:
      "Capture quick snapshots of team sentiment with expressive mood pickers and lightweight follow-up prompts.",
    emoji: "🌈",
    accentColor: "text-pink-600",
    accentGradient: "from-pink-500/90 via-rose-500/90 to-orange-400/80",
    highlights: ["Mood tracker with emojis", "Workload & energy check", "Weekly wins & support"],
    schema: {
      version: 2,
      sections: [
        {
          id: "pulse-today",
          title: "How are you feeling?",
          description: "A quick pulse on energy, focus, and workload.",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "pulse-mood",
              type: "chips",
              label: "How are you feeling today?",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "😀 Energized", value: "energized" },
                { label: "🙂 Balanced", value: "balanced" },
                { label: "😌 Calm", value: "calm" },
                { label: "😕 Stretched", value: "stretched" },
                { label: "😔 Drained", value: "drained" },
              ],
              helpText: "Your honest mood helps us shape support for the week.",
              validation: {
                required: true,
              },
            },
            {
              id: "pulse-energy",
              type: "chips",
              label: "How manageable is your workload right now?",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "🟢 Sustainable", value: "sustainable" },
                { label: "🟡 Busy", value: "busy" },
                { label: "🟠 At capacity", value: "capacity" },
                { label: "🔴 Overloaded", value: "overloaded" },
              ],
              validation: {
                required: true,
              },
            },
          ],
        },
        {
          id: "pulse-retrospective",
          title: "Weekly reflection",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "pulse-highlight",
              type: "textarea",
              label: "What was a highlight or win this week?",
              placeholder: "Celebrate progress, shout out teammates, or share momentum...",
              required: false,
            },
            {
              id: "pulse-support",
              type: "textarea",
              label: "Where could leadership support you better?",
              placeholder: "Let us know what would make next week smoother...",
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    name: "Annual Engagement Survey",
    slug: "annual-engagement-survey",
    description:
      "A comprehensive temperature check covering engagement, leadership, growth, and culture touchpoints.",
    emoji: "🧭",
    accentColor: "text-emerald-600",
    accentGradient: "from-emerald-500/90 via-teal-500/90 to-cyan-500/80",
    highlights: ["Engagement benchmarks", "Leadership & culture insights", "Open feedback prompts"],
    schema: {
      version: 2,
      sections: [
        {
          id: "annual-engagement",
          title: "Engagement & Experience",
          description: "Help us understand the overall employee experience across the organisation.",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "annual-engagement-level",
              type: "chips",
              label: "Overall, how engaged do you feel at work?",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "1 - Disengaged", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" },
                { label: "4", value: "4" },
                { label: "5 - Highly Engaged", value: "5" },
              ],
              validation: {
                required: true,
              },
            },
            {
              id: "annual-advocacy",
              type: "chips",
              label: "How likely are you to recommend our company as a great place to work?",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "Very unlikely", value: "very-unlikely" },
                { label: "Unlikely", value: "unlikely" },
                { label: "Neutral", value: "neutral" },
                { label: "Likely", value: "likely" },
                { label: "Very likely", value: "very-likely" },
              ],
              validation: {
                required: true,
              },
            },
          ],
        },
        {
          id: "annual-leadership",
          title: "Leadership & Culture",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "annual-leadership-confidence",
              type: "chips",
              label: "I feel confident in the direction leadership is setting.",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "Strongly disagree", value: "strongly-disagree" },
                { label: "Disagree", value: "disagree" },
                { label: "Neutral", value: "neutral" },
                { label: "Agree", value: "agree" },
                { label: "Strongly agree", value: "strongly-agree" },
              ],
              validation: {
                required: true,
              },
            },
            {
              id: "annual-voice",
              type: "chips",
              label: "I have the opportunity to voice ideas and concerns.",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "Strongly disagree", value: "strongly-disagree" },
                { label: "Disagree", value: "disagree" },
                { label: "Neutral", value: "neutral" },
                { label: "Agree", value: "agree" },
                { label: "Strongly agree", value: "strongly-agree" },
              ],
              validation: {
                required: true,
              },
            },
          ],
        },
        {
          id: "annual-growth",
          title: "Growth & Support",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "annual-growth-path",
              type: "chips",
              label: "I can see a clear path for growth here.",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "Strongly disagree", value: "strongly-disagree" },
                { label: "Disagree", value: "disagree" },
                { label: "Neutral", value: "neutral" },
                { label: "Agree", value: "agree" },
                { label: "Strongly agree", value: "strongly-agree" },
              ],
              validation: {
                required: true,
              },
            },
            {
              id: "annual-learning",
              type: "chips",
              label: "I have access to the learning resources I need.",
              required: true,
              appearance: "buttons",
              optionItems: [
                { label: "Strongly disagree", value: "strongly-disagree" },
                { label: "Disagree", value: "disagree" },
                { label: "Neutral", value: "neutral" },
                { label: "Agree", value: "agree" },
                { label: "Strongly agree", value: "strongly-agree" },
              ],
              validation: {
                required: true,
              },
            },
          ],
        },
        {
          id: "annual-open-feedback",
          title: "Open feedback",
          columns: 1,
          layout: "single",
          hidden: false,
          fields: [
            {
              id: "annual-proud",
              type: "textarea",
              label: "What makes you most proud to work here?",
              placeholder: "Share moments, values, or experiences that stand out...",
              required: false,
            },
            {
              id: "annual-improvement",
              type: "textarea",
              label: "What is one thing we should start, stop, or continue doing next year?",
              placeholder: "Help us prioritise meaningful change...",
              required: false,
            },
          ],
        },
      ],
    },
  },
];

let ensurePromise: Promise<any[]> | null = null;

export async function ensureDefaultSurveyTemplates(): Promise<any[]> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      let list: any[] = [];
      try {
        const existingRes = await fetch("/api/forms?type=SURVEY");
        if (existingRes.ok) {
          const payload = await existingRes.json();
          list = Array.isArray(payload) ? payload : payload.forms || [];
        }

        const missing = DEFAULT_SURVEY_TEMPLATES.filter(
          (template) =>
            !list.some(
              (form: any) =>
                form?.slug === template.slug ||
                form?.name?.toLowerCase() === template.name.toLowerCase(),
            ),
        );

        if (missing.length) {
          for (const template of missing) {
            await fetch("/api/forms", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: template.name,
                slug: template.slug,
                description: template.description,
                formType: "SURVEY",
                schema: template.schema,
                visibleToRoles: ["ADMIN", "MANAGER"],
                visibleToDepartments: [],
                visibleToJobRoles: [],
              }),
            });
          }

          const refreshRes = await fetch("/api/forms?type=SURVEY");
          if (refreshRes.ok) {
            const payload = await refreshRes.json();
            list = Array.isArray(payload) ? payload : payload.forms || [];
          }
        }
      } catch (error) {
        console.error("Failed to ensure default survey templates", error);
      } finally {
        ensurePromise = null;
      }

      return list;
    })();
  }

  return ensurePromise;
}

export function findTemplateMetaBySlug(slug?: string) {
  if (!slug) return undefined;
  return DEFAULT_SURVEY_TEMPLATES.find((template) => template.slug === slug);
}

