import test from 'node:test';
import assert from 'node:assert/strict';
import { exitInterviewSchema } from '../app/api/offboarding/[id]/exit-interview/schema';

const sample = {
  scheduledAt: new Date().toISOString(),
  interviewerId: 'user123',
  location: 'Meeting room',
  notes: 'Bring laptop',
  completed: false,
};

test('exitInterviewSchema parses sample payload', () => {
  const parsed = exitInterviewSchema.parse(sample);
  assert.equal(parsed.location, 'Meeting room');
});
