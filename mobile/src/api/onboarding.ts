import { apiClient, apiFetch } from './client';

export interface OnboardingStep {
  id: string;
  instanceStepId: string | null;
  type: string;
  label: string;
  instruction?: string;
  uploadType?: string;
  documentId?: string;
  document?: {
    id: string;
    name: string;
    url: string | null;
  };
  formId?: string;
  form?: {
    id: string;
    name: string;
    formType?: string;
  };
  metadata: Record<string, any>;
  existingResponse?: any;
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface OnboardingInstance {
  id: string;
  template: {
    name: string;
  };
  steps: OnboardingStep[];
}

export interface OnboardingStatus {
  hasOnboarding: boolean;
  isComplete: boolean;
  instance?: OnboardingInstance;
  employeeId?: string;
  progress?: {
    completed: number;
    total: number;
    percent: number;
  };
}

/**
 * Check if the current user has pending onboarding
 */
export async function getOnboardingStatus(employeeId: string): Promise<OnboardingStatus> {
  try {
    const response = await apiFetch(`/api/onboarding/instances/${employeeId}`);
    
    // 404 means no active onboarding - this is normal for most employees
    if (response.status === 404) {
      return { hasOnboarding: false, isComplete: true };
    }
    
    // Other non-OK responses should be handled gracefully
    if (!response.ok) {
      console.warn('[onboarding] Non-404 error fetching status:', response.status);
      return { hasOnboarding: false, isComplete: true };
    }
    
    const instance: OnboardingInstance = await response.json();
    const steps = instance.steps || [];
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const totalSteps = steps.length;
    const isComplete = totalSteps > 0 && completedSteps === totalSteps;
    
    return {
      hasOnboarding: true,
      isComplete,
      instance,
      employeeId,
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      },
    };
  } catch (error) {
    // Network errors or other exceptions - fail gracefully
    console.warn('[onboarding] Exception fetching status:', error);
    return { hasOnboarding: false, isComplete: true };
  }
}

/**
 * Complete an onboarding step
 */
export async function completeOnboardingStep(
  stepId: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string; onboardingCompleted?: boolean }> {
  try {
    const response = await apiFetch(`/api/onboarding/step/${stepId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || 'Failed to complete step' 
      };
    }
    
    const result = await response.json();
    return { 
      success: true, 
      onboardingCompleted: result.onboardingCompleted 
    };
  } catch (error) {
    console.error('[onboarding] Error completing step:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Acknowledge a document
 */
export async function acknowledgeDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiFetch('/api/documents/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || 'Failed to acknowledge document' 
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[onboarding] Error acknowledging document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Upload a document for an onboarding step
 */
export async function uploadOnboardingDocument(
  file: { uri: string; name: string; type: string },
  employeeId: string,
  category: string = 'Onboarding'
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    formData.append('name', file.name);
    formData.append('category', category);
    formData.append('employeeId', employeeId);
    formData.append('canViewAdmin', 'true');
    formData.append('canViewManager', 'false');
    formData.append('canViewEmployee', 'true');
    formData.append('requiresAck', 'false');
    
    const response = await apiFetch('/api/documents/upload-employee', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || 'Failed to upload document' 
      };
    }
    
    const result = await response.json();
    return { success: true, documentId: result.id };
  } catch (error) {
    console.error('[onboarding] Error uploading document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Get form schema for a fill-form step
 */
export async function getFormSchema(formId: string): Promise<{ success: boolean; schema?: any; error?: string }> {
  try {
    const response = await apiFetch(`/api/forms/${formId}`);
    
    if (!response.ok) {
      return { success: false, error: 'Failed to load form' };
    }
    
    const schema = await response.json();
    return { success: true, schema };
  } catch (error) {
    console.error('[onboarding] Error fetching form schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}
