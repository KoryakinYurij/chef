import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticCompressor, AdvancedTokenEstimator, type RetentionStrategy } from './SemanticCompressor.js';
import type { UIMessage } from 'ai';

// Mock embedding function for testing
const mockEmbeddingFunction = vi.fn(async (text: string): Promise<number[]> => {
  // Simple mock embeddings based on text content
  const words = text.toLowerCase().split(' ');
  return words.map(word => word.charCodeAt(0) / 100);
});

describe('SemanticCompressor', () => {
  let compressor: SemanticCompressor;

  beforeEach(() => {
    compressor = new SemanticCompressor(mockEmbeddingFunction);
  });

  describe('compressContext', () => {
    it('should compress context while preserving quality', async () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Create a React component for a button',
          createdAt: new Date('2023-01-01'),
          parts: []
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Here is a React button component: ```jsx\nconst Button = ({ children, onClick }) => {\n  return <button onClick={onClick}>{children}</button>;\n};\n```',
          createdAt: new Date('2023-01-01'),
          parts: []
        },
        {
          id: '3',
          role: 'user',
          content: 'Can you add styling to make it look better?',
          createdAt: new Date('2023-01-01'),
          parts: []
        },
        {
          id: '4',
          role: 'assistant',
          content: 'Certainly! Here is the enhanced button with CSS: ```jsx\nconst Button = ({ children, onClick, className }) => {\n  return (\n    <button \n      onClick={onClick} \n      className={`px-4 py-2 bg-blue-500 text-white rounded ${className}`}\n    >\n      {children}\n    </button>\n  );\n};\n```',
          createdAt: new Date('2023-01-01'),
          parts: []
        }
      ];

      const result = await compressor.compressContext(messages, 500, 'balanced');

      expect(result.messages.length).toBeLessThan(messages.length);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0.8);
      expect(result.compressionRatio).toBeLessThan(1);
      expect(result.preservedEntities).toContain('Button');
      expect(result.preservedEntities).toContain('jsx');
    });

    it('should handle aggressive compression strategy', async () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Create a complex React application with multiple components, state management, and API integration',
          createdAt: new Date('2023-01-01'),
          parts: []
        },
        {
          id: '2',
          role: 'assistant',
          content: 'I will help you create a comprehensive React application. Let me start by setting up the project structure and installing necessary dependencies.',
          createdAt: new Date('2023-01-01'),
          parts: []
        }
      ];

      const result = await compressor.compressContext(messages, 100, 'aggressive');

      expect(result.messages.length).toBeLessThanOrEqual(2);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0.7);
      expect(result.compressionRatio).toBeLessThan(0.8);
    });

    it('should handle conservative compression strategy', async () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'What is the weather like today?',
          createdAt: new Date('2023-01-01'),
          parts: []
        },
        {
          id: '2',
          role: 'assistant',
          content: 'I cannot access real-time weather data. Please check a weather service or app for current conditions.',
          createdAt: new Date('2023-01-01'),
          parts: []
        }
      ];

      const result = await compressor.compressContext(messages, 200, 'conservative');

      expect(result.qualityScore).toBeGreaterThanOrEqual(0.9);
      expect(result.compressionRatio).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('AdvancedTokenEstimator', () => {
    let estimator: AdvancedTokenEstimator;

    beforeEach(() => {
      estimator = new AdvancedTokenEstimator();
    });

    it('should estimate tokens accurately for different models', () => {
      const text = 'This is a test message with some words.';

      const gptTokens = estimator.estimateTokens(text, 'gpt-3.5-turbo');
      const claudeTokens = estimator.estimateTokens(text, 'claude-3');

      expect(gptTokens).toBeGreaterThan(0);
      expect(claudeTokens).toBeGreaterThan(0);
      expect(gptTokens).toBeLessThanOrEqual(text.length / 3);
    });

    it('should provide detailed breakdown', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello world',
          createdAt: new Date('2023-01-01'),
          parts: []
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there! How can I help you today?',
          createdAt: new Date('2023-01-01'),
          parts: []
        }
      ];

      const breakdown = estimator.getDetailedBreakdown(messages, 'gpt-3.5-turbo');

      expect(breakdown.totalTokens).toBeGreaterThan(0);
      expect(breakdown.messageTokens).toHaveLength(2);
      expect(breakdown.currentTurnTokens).toBeGreaterThan(0);
      expect(breakdown.accuracy).toBe('medium');
    });
  });

  describe('entity extraction', () => {
    it('should extract important entities', () => {
      const compressor = new SemanticCompressor();
      
      const content = 'Here is a function: function test() { return 42; }';
      const entities = (compressor as any).extractImportantEntities(content);
      
      expect(entities).toContain('function');
    });
  });
});