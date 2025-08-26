import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { renderField } from '../app/components/forms/EnhancedFormRenderer';

(global as any).React = React;

test('renders existing document preview for file fields', () => {
  const field: any = { id: 'f1', type: 'file', label: 'Doc', required: false };
  const register = () => ({ });
  const watch = (id: string) => id === 'f1' ? { url: '/docs/test.pdf', name: 'test.pdf' } : null;
  const html = renderToString(
    renderField(field, register, watch, () => {})
  );
  assert.ok(html.includes('<iframe'));
  assert.ok(html.includes('/docs/test.pdf'));
  assert.ok(html.includes('test.pdf'));
});
