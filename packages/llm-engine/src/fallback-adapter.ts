import type {
  CandidateGenerationRequest,
  GeneratedCandidate,
  GeneratedReport,
  ILLMPort,
  LLMParseRequest,
  ParsedInquiryData,
  ReportGenerationRequest,
} from '@ip-review/domain';

const TRANSIENT_ERROR_PATTERNS = [
  'overloaded',
  '과부하',
  'rate_limit',
  'timeout',
  'fetch failed',
  'ECONNRESET',
  'ETIMEDOUT',
  ' 408',
  ' 409',
  ' 429',
  ' 500',
  ' 502',
  ' 503',
  ' 504',
  ' 529',
];

function isTransientProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export class FallbackLLMAdapter implements ILLMPort {
  constructor(
    private readonly primary: ILLMPort,
    private readonly fallback: ILLMPort,
    private readonly label = 'fallback'
  ) {}

  async isAvailable(): Promise<boolean> {
    return (await this.primary.isAvailable()) || (await this.fallback.isAvailable());
  }

  async parseInquiry(request: LLMParseRequest): Promise<ParsedInquiryData> {
    try {
      return await this.primary.parseInquiry(request);
    } catch (error) {
      if (!isTransientProviderError(error)) throw error;
      this.logFallback('parseInquiry', error);
      return this.fallback.parseInquiry(request);
    }
  }

  async generateCandidates(request: CandidateGenerationRequest): Promise<GeneratedCandidate[]> {
    try {
      return await this.primary.generateCandidates(request);
    } catch (error) {
      if (!isTransientProviderError(error)) throw error;
      this.logFallback('generateCandidates', error);
      return this.fallback.generateCandidates(request);
    }
  }

  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    try {
      return await this.primary.generateReport(request);
    } catch (error) {
      if (!isTransientProviderError(error)) throw error;
      this.logFallback('generateReport', error);
      return this.fallback.generateReport(request);
    }
  }

  private logFallback(operation: string, error: unknown): void {
    console.warn(`[llm-fallback] primary ${operation} failed; using ${this.label}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
