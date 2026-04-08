/**
 * LLM 어댑터 팩토리
 * LLM_PROVIDER_MODE 환경변수에 따라 적절한 어댑터 반환
 */

import type { ILLMPort } from '@ip-review/domain';
import { AnthropicLLMAdapter } from './anthropic-adapter';
import { GeminiLLMAdapter } from './gemini-adapter';
import { MockLLMAdapter } from './mock-adapter';

export type LLMProviderMode = 'mock' | 'gemini' | 'claude' | 'anthropic';

export function createClaudeOnlyLLMPort(): ILLMPort {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for Claude-only LLM processing');
  }
  return new AnthropicLLMAdapter(apiKey);
}

export function createLLMPort(mode?: LLMProviderMode | string): ILLMPort {
  const resolvedMode = mode ?? process.env.LLM_PROVIDER_MODE ?? 'claude';

  switch (resolvedMode) {
    case 'claude':
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required for Claude LLM processing');
      }
      return new AnthropicLLMAdapter(apiKey);
    }
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[LLMFactory] GEMINI_API_KEY 없음 → mock으로 폴백');
        return new MockLLMAdapter();
      }
      return new GeminiLLMAdapter(apiKey);
    }
    case 'mock':
    default:
      return new MockLLMAdapter();
  }
}
