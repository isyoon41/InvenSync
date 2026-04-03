/**
 * LLM 어댑터 팩토리
 * LLM_PROVIDER_MODE 환경변수에 따라 적절한 어댑터 반환
 */

import type { ILLMPort } from '@ip-review/domain';
import { GeminiLLMAdapter } from './gemini-adapter.js';
import { MockLLMAdapter } from './mock-adapter.js';

export type LLMProviderMode = 'mock' | 'gemini';

export function createLLMPort(mode?: LLMProviderMode | string): ILLMPort {
  const resolvedMode = mode ?? process.env.LLM_PROVIDER_MODE ?? 'mock';

  switch (resolvedMode) {
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
