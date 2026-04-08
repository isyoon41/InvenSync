/**
 * TrademarkProvider 팩토리
 * TRADEMARK_PROVIDER_MODE 환경변수에 따라 적절한 어댑터 반환
 */

import type { ITrademarkSearchPort } from '@ip-review/domain';
import { KiprisAdapter } from './kipris-adapter';
import { MockTrademarkAdapter } from './mock-adapter';

export type TrademarkProviderMode = 'mock' | 'kipris' | 'python-sidecar';

export function createKiprisOnlyTrademarkSearchPort(): ITrademarkSearchPort {
  const accessKey = process.env.KIPRIS_API_KEY;
  if (!accessKey) {
    throw new Error('KIPRIS_API_KEY is required for KIPRIS trademark search');
  }
  return new KiprisAdapter(accessKey);
}

export function createTrademarkSearchPort(
  mode?: TrademarkProviderMode | string
): ITrademarkSearchPort {
  const resolvedMode = mode ?? process.env.TRADEMARK_PROVIDER_MODE ?? 'mock';

  switch (resolvedMode) {
    case 'kipris': {
      const accessKey = process.env.KIPRIS_API_KEY;
      if (!accessKey) {
        console.warn('[TrademarkFactory] KIPRIS_API_KEY 없음 → mock으로 폴백');
        return new MockTrademarkAdapter();
      }
      return new KiprisAdapter(accessKey);
    }

    case 'mock':
    default:
      return new MockTrademarkAdapter();
  }
}
