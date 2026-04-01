export interface CreateInquiryFormData {
  title: string;
  rawText: string;
  proposedMarkName?: string;
  senderEmail?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateCreateInquiry(data: Partial<CreateInquiryFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title?.trim()) {
    errors.title = '제목을 입력해 주세요.';
  } else if (data.title.trim().length < 3) {
    errors.title = '제목은 최소 3자 이상이어야 합니다.';
  }

  if (!data.rawText?.trim()) {
    errors.rawText = '요청 내용을 입력해 주세요.';
  } else if (data.rawText.trim().length < 10) {
    errors.rawText = '요청 내용은 최소 10자 이상이어야 합니다.';
  }

  if (data.senderEmail && !data.senderEmail.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    errors.senderEmail = '유효한 이메일 주소를 입력해 주세요.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
