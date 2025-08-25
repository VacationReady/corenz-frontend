import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

// Ensure Prisma client can be instantiated without real DB
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';

import { OnboardingStepType } from '@prisma/client';
import { prisma } from '../app/lib/prisma';

test('mapSteps includes FORM_FILL steps', async () => {
  const { mapSteps } = await import('../app/api/onboarding/templates/stepMapper');
  const result = mapSteps([
    { type: 'fill-form', label: 'Form step', formId: 'form123' },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, OnboardingStepType.FORM_FILL);
  assert.equal(result[0].formId, 'form123');
});

test('createTemplate persists FORM_FILL step and returns it', async () => {
  const prismaMock = {
    onboardingTemplate: {
      create: async (args: any) => ({
        ...args.data,
        steps: args.data.steps?.create || [],
      }),
    },
  };

  const { createTemplate } = await import('../app/api/onboarding/templates/actions');

  const session = { user: { companyId: 'c1', id: 'u1' } };
  const body = {
    name: 'Template',
    description: '',
    steps: [
      { type: 'fill-form', label: 'Fill Form', formId: 'form123' },
    ],
  };

  const result = await createTemplate(session, body, prismaMock as any);
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].type, OnboardingStepType.FORM_FILL);
  assert.equal(result.steps[0].formId, 'form123');
});
