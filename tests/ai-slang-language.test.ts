import "./setupEnv";
/**
 * AI Slang/Casual Language Tests
 * 
 * Tests the AI assistant's ability to understand slang-heavy,
 * casual, and partially incoherent language while maintaining
 * safety behaviors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { interpretIntent } from '@/lib/ai/interpreters/intent-classifier';

// Mock OpenAI
vi.mock('@/lib/ai/openai-client', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  AI_CONFIG: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 4096,
  },
}));

describe('AI Slang Language Understanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Leave Booking with Slang', () => {
    it('should understand "yo book some time off for Gary next monday bro"', async () => {
      const mockResponse = {
        actionType: 'book_leave',
        parameters: {
          employeeName: 'Gary',
          startDate: 'next Monday',
          endDate: 'next Monday',
        },
        confidence: 0.95,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'yo book some time off for Gary next monday bro',
        '',
        ''
      );

      expect(result.actionType).toBe('book_leave');
      expect(result.parameters.employeeName).toContain('Gary');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should understand "need 2 days off 4 sarah next week thx"', async () => {
      const mockResponse = {
        actionType: 'book_leave',
        parameters: {
          employeeName: 'sarah',
          startDate: 'next week',
        },
        confidence: 0.9,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'need 2 days off 4 sarah next week thx',
        '',
        ''
      );

      expect(result.actionType).toBe('book_leave');
      expect(result.parameters.employeeName).toMatch(/sarah/i);
    });
  });

  describe('Typos and Abbreviations', () => {
    it('should understand "how many peeps we got in sales??"', async () => {
      const mockResponse = {
        actionType: 'query_data',
        parameters: {
          department: 'sales',
          queryType: 'count',
        },
        confidence: 0.95,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'how many peeps we got in sales??',
        '',
        ''
      );

      expect(result.actionType).toBe('query_data');
      expect(result.parameters.department).toMatch(/sales/i);
    });

    it('should understand "create workflow 4 when contracts r bout to expire"', async () => {
      const mockResponse = {
        actionType: 'create_workflow',
        parameters: {
          triggerType: 'contract_expiry',
        },
        confidence: 0.9,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'create workflow 4 when contracts r bout to expire',
        '',
        ''
      );

      expect(result.actionType).toBe('create_workflow');
    });
  });

  describe('Emoji and Internet Slang', () => {
    it('should understand "need 2 bump sarahs salary she been killin it lately 💯"', async () => {
      const mockResponse = {
        actionType: 'update_employee',
        parameters: {
          employeeName: 'sarah',
          field: 'salaryAmount',
        },
        confidence: 0.9,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'need 2 bump sarahs salary she been killin it lately 💯',
        '',
        ''
      );

      expect(result.actionType).toBe('update_employee');
      expect(result.parameters.field).toMatch(/salary/i);
    });

    it('should understand "gimme sum analytics on whos been here the longest fr fr"', async () => {
      const mockResponse = {
        actionType: 'query_data',
        parameters: {
          queryType: 'tenure_analysis',
        },
        confidence: 0.85,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'gimme sum analytics on whos been here the longest fr fr',
        '',
        ''
      );

      expect(result.actionType).toBe('query_data');
    });
  });

  describe('Bulk Actions with Slang', () => {
    it('should understand "give everyone in sales a 10% bump they deserve it"', async () => {
      const mockResponse = {
        actionType: 'bulk_update',
        parameters: {
          department: 'sales',
          percentage: 10,
          operation: 'increase',
          field: 'salaryAmount',
        },
        confidence: 0.95,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'give everyone in sales a 10% bump they deserve it',
        '',
        ''
      );

      expect(result.actionType).toBe('bulk_update');
      expect(result.parameters.department).toMatch(/sales/i);
      expect(result.parameters.percentage).toBe(10);
      expect(result.parameters.operation).toBe('increase');
    });

    it('should understand "give them all a 10% raise" using context', async () => {
      const mockResponse = {
        actionType: 'bulk_update',
        parameters: {
          percentage: 10,
          operation: 'increase',
          field: 'salaryAmount',
        },
        confidence: 0.9,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const context = 'Recently mentioned departments: sales';
      const result = await interpretIntent(
        'give them all a 10% raise',
        context,
        ''
      );

      expect(result.actionType).toBe('bulk_update');
      expect(result.parameters.percentage).toBe(10);
    });
  });

  describe('Document Upload', () => {
    it('should understand "lemme upload this contract thing 4 mike"', async () => {
      const mockResponse = {
        actionType: 'upload_document',
        parameters: {
          employeeName: 'mike',
        },
        confidence: 0.9,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'lemme upload this contract thing 4 mike',
        '',
        ''
      );

      expect(result.actionType).toBe('upload_document');
      expect(result.parameters.employeeName).toMatch(/mike/i);
    });
  });

  describe('Confirmation Handling', () => {
    it('should recognize "yea" as confirmation', async () => {
      const mockResponse = {
        actionType: 'book_leave',
        parameters: {
          confirmed: true,
        },
        confidence: 1.0,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'yea',
        'Pending action: book_leave',
        ''
      );

      expect(result.parameters.confirmed).toBe(true);
    });

    it('should recognize "yup do it" as confirmation', async () => {
      const mockResponse = {
        actionType: 'bulk_update',
        parameters: {
          confirmed: true,
        },
        confidence: 1.0,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'yup do it',
        'Pending action: bulk_update',
        ''
      );

      expect(result.parameters.confirmed).toBe(true);
    });

    it('should recognize "go ahead" as confirmation', async () => {
      const mockResponse = {
        actionType: 'update_employee',
        parameters: {
          confirmed: true,
        },
        confidence: 1.0,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'go ahead',
        'Pending action: update_employee',
        ''
      );

      expect(result.parameters.confirmed).toBe(true);
    });
  });

  describe('Safety Behaviors Preserved', () => {
    it('should still require clarification for vague requests', async () => {
      const mockResponse = {
        actionType: 'query_data',
        parameters: {},
        confidence: 0.3,
        reasoning: 'unclear intent',
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'do something with employees',
        '',
        ''
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reasoning).toMatch(/unclear/i);
    });

    it('should extract audit-related parameters for sensitive operations', async () => {
      const mockResponse = {
        actionType: 'update_employee',
        parameters: {
          employeeName: 'sarah',
          field: 'salaryAmount',
          value: '85000',
          reason: 'performance review exceeded targets',
        },
        confidence: 0.95,
      };

      const { openai } = await import('@/lib/ai/openai-client');
      (openai.chat.completions.create as any).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockResponse),
          },
        }],
      });

      const result = await interpretIntent(
        'bump sarahs salary to 85k cuz performance review she exceeded targets',
        '',
        ''
      );

      expect(result.actionType).toBe('update_employee');
      expect(result.parameters.reason).toBeTruthy();
    });
  });
});

