import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Module from 'module';

let capturedProps: any = null;
(global as any).React = React;

const originalLoad = (Module as any)._load;
(Module as any)._load = function(request: string, parent: any, isMain: boolean) {
  if (request === '@/components/forms/DynamicFormRenderer') {
    return {
      DynamicFormRenderer: (props: any) => {
        capturedProps = props;
        return React.createElement('div');
      },
    };
  }
  if (request === 'next-auth/react') {
    return {
      useSession: () => ({ data: { user: { id: 'u1', companyId: 'c1' } } }),
    };
  }
  return originalLoad(request, parent, isMain);
};

const OnboardingStepRenderer = require('../app/components/onboarding/OnboardingStepRenderer').default;

test('passes employeeId to DynamicFormRenderer', () => {
  const step = { id: 's1', type: 'fill-form', formId: 'f1', title: 'Form', description: '' };
  renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: () => {},
      employeeId: 'emp123',
    })
  );
  assert.equal(capturedProps.employeeId, 'emp123');
});
