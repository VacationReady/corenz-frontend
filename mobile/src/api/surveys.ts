import { apiFetch } from './client';

export interface Survey {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: 'draft' | 'active' | 'closed';
  formSchema: any;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  responses: any;
  submittedAt: string;
}

/**
 * Get pending surveys for the current user
 */
export async function getPendingSurveys(): Promise<Survey[]> {
  const response = await apiFetch('/api/surveys?scope=assigned&status=active', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch surveys');
  }

  return response.json();
}

/**
 * Get completed surveys
 */
export async function getCompletedSurveys(): Promise<Survey[]> {
  const response = await apiFetch('/api/surveys?scope=completed', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch completed surveys');
  }

  return response.json();
}

/**
 * Submit survey response
 */
export async function submitSurveyResponse(surveyId: string, responses: any): Promise<SurveyResponse> {
  const response = await apiFetch(`/api/surveys/${surveyId}/responses`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit survey response');
  }

  return response.json();
}

/**
 * Get survey details
 */
export async function getSurveyDetails(surveyId: string): Promise<Survey> {
  const response = await apiFetch(`/api/surveys/${surveyId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch survey details');
  }

  return response.json();
}
