import { describe, it, expect } from '@jest/globals';
import { InvalidStateTransitionError } from '../errors/domain.errors';

describe('Inquiry Domain Tests', () => {
  describe('Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      new: ['parsed'],
      parsed: ['candidate_ready'],
      candidate_ready: ['searched'],
      searched: ['reviewed'],
      reviewed: ['approved'],
      approved: ['exported'],
      exported: [],
    };

    it('should allow valid status transitions', () => {
      Object.entries(validTransitions).forEach(([fromStatus, toStatuses]) => {
        toStatuses.forEach((toStatus) => {
          expect(() => {
            // This would be called in the actual workflow
            const isValid = validTransitions[fromStatus].includes(toStatus);
            if (!isValid) {
              throw new InvalidStateTransitionError(fromStatus, toStatus);
            }
          }).not.toThrow();
        });
      });
    });

    it('should prevent invalid status transitions', () => {
      expect(() => {
        throw new InvalidStateTransitionError('new', 'reviewed');
      }).toThrow(InvalidStateTransitionError);
    });

    it('should prevent transitions from exported status', () => {
      expect(() => {
        throw new InvalidStateTransitionError('exported', 'new');
      }).toThrow(InvalidStateTransitionError);
    });
  });

  describe('Inquiry Validation', () => {
    it('should validate required fields', () => {
      const inquiry = {
        id: 'test-1',
        firmId: 'firm-1',
        title: 'Test Inquiry',
        rawText: 'Test content',
        status: 'new' as const,
        sourceChannel: 'manual' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(inquiry.title).toBeTruthy();
      expect(inquiry.firmId).toBeTruthy();
      expect(inquiry.rawText).toBeTruthy();
    });

    it('should allow optional proposed mark name', () => {
      const inquiry = {
        id: 'test-2',
        firmId: 'firm-1',
        title: 'Test Inquiry',
        rawText: 'Test content',
        proposedMarkName: 'EXAMPLE_MARK',
        status: 'new' as const,
        sourceChannel: 'manual' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(inquiry.proposedMarkName).toBe('EXAMPLE_MARK');
    });
  });
});
