export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, "NOT_FOUND", { entity, id });
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR", { field });
    this.name = "ValidationError";
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(currentState: string, targetState: string, reason?: string) {
    super(
      `Cannot transition from ${currentState} to ${targetState}${reason ? ": " + reason : ""}`,
      "INVALID_STATE_TRANSITION",
      { currentState, targetState }
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class ExternalServiceError extends DomainError {
  constructor(
    serviceName: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(
      `${serviceName} error: ${message}`,
      "EXTERNAL_SERVICE_ERROR",
      { serviceName }
    );
    this.name = "ExternalServiceError";
  }
}

export class InquiryProcessingError extends DomainError {
  constructor(inquiryId: string, stage: string, message: string) {
    super(`Failed to process inquiry at ${stage}: ${message}`, "PROCESSING_ERROR", {
      inquiryId,
      stage,
    });
    this.name = "InquiryProcessingError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, "CONFLICT", context);
    this.name = "ConflictError";
  }
}
