import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Module from 'module';

let capturedProps: any = null;
let capturedEnhancedProps: any = null;
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
  if (request === '@/components/forms/EnhancedFormRenderer') {
    return {
      EnhancedFormRenderer: (props: any) => {
        capturedEnhancedProps = props;
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
  const step = { id: 's1', type: 'fill-form', formId: 'f1', form: { formType: 'SUBMISSION' }, title: 'Form', description: '' };
  renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: () => {},
      employeeId: 'emp123',
    })
  );
  assert.equal(capturedProps.employeeId, 'emp123');
});

test('wraps submitted data and dispatches document update', () => {
  const step = { id: 's1', type: 'fill-form', formId: 'f1', form: { formType: 'SUBMISSION' }, title: 'Form', description: '' };
  let received: any = null;
  const events: any[] = [];
  // listen for custom event
  (global as any).window = {
    dispatchEvent: (e: any) => events.push(e.detail),
    addEventListener: () => {},
  } as any;

  renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: (d: any) => { received = d; },
      employeeId: 'emp123',
    })
  );

  // simulate form submission
  capturedProps.onSubmitSuccess({ foo: 'bar' });

  assert.deepEqual(received, { formResponse: { foo: 'bar' } });
  assert.deepEqual(events[0], { employeeId: 'emp123' });
});

test('uses EnhancedFormRenderer for data screen forms', () => {
  const step = { id: 's1', type: 'fill-form', formId: 'f1', form: { formType: 'DATA_SCREEN' }, title: 'Form', description: '' };
  let received: any = null;
  const events: any[] = [];
  (global as any).window = {
    dispatchEvent: (e: any) => events.push(e.detail),
    addEventListener: () => {},
  } as any;

  renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: (d: any) => { received = d; },
      employeeId: 'emp123',
    })
  );

  capturedEnhancedProps.onDataChange({ baz: 'qux' });

  assert.deepEqual(received, { formResponse: { baz: 'qux' } });
  assert.deepEqual(events[0], { employeeId: 'emp123' });
});
