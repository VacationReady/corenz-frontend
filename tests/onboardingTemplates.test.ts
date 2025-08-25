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

test('mapSteps includes ACKNOWLEDGE_DOCUMENT steps', async () => {
  const { mapSteps } = await import('../app/api/onboarding/templates/stepMapper');
  const result = mapSteps([
    { type: 'acknowledge-document', label: 'Read Doc', documentId: 'doc1' },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, OnboardingStepType.ACKNOWLEDGE_DOCUMENT);
  assert.equal(result[0].documentId, 'doc1');
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

test('updateTemplate cascades deletions before recreating steps', async () => {
  const callOrder: string[] = [];
  const prismaMock = {
    onboardingStepResponse: {
      deleteMany: mock.fn(async () => { callOrder.push('responses'); }),
    },
    onboardingStepInstance: {
      deleteMany: mock.fn(async () => { callOrder.push('instances'); }),
    },
    onboardingStep: {
      deleteMany: mock.fn(async () => { callOrder.push('steps'); }),
    },
    onboardingTemplate: {
      update: async (args: any) => ({
        ...args.data,
        steps: args.data.steps?.create || [],
      }),
    },
  };

  const { updateTemplate } = await import('../app/api/onboarding/templates/actions');
  const session = { user: { companyId: 'c1', id: 'u1' } };
  const body = {
    id: 't1',
    name: 'Template',
    steps: [
      { type: 'acknowledge-document', label: 'Read Doc', documentId: 'doc1' },
    ],
  };

  const result = await updateTemplate(session, body, prismaMock as any);
  assert.deepEqual(callOrder, ['responses', 'instances', 'steps']);
  assert.equal(result.steps[0].type, OnboardingStepType.ACKNOWLEDGE_DOCUMENT);
  assert.equal(result.steps[0].documentId, 'doc1');
});
