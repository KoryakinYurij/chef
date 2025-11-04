import { type Message, type UIMessage } from 'ai';
import { useState, useCallback, useMemo } from 'react';
import { SemanticCompressor, AdvancedTokenEstimator } from 'chef-agent/SemanticCompressor';
import type { RetentionStrategy, CompressedContext } from 'chef-agent/SemanticCompressor';
import { ChatContextManager } from 'chef-agent/ChatContextManager';
import { Button } from '@ui/Button';
import { ResetIcon, InfoCircledIcon, ChevronDownIcon } from '@radix-ui/react-icons';

interface ContextControlsProps {
  messages: Message[];
  setMessages?: (messages: Message[]) => void;
  maxCollapsedMessagesSize: number;
  minCollapsedMessagesSize: number;
  className?: string;
}

interface CompressionOptions {
  strategy: RetentionStrategy;
  preserveRecentMessages: boolean;
  targetReduction: number; // percentage (0-90)
}

export const ContextControls = ({
  messages,
  setMessages,
  maxCollapsedMessagesSize,
  minCollapsedMessagesSize,
  className = ''
}: ContextControlsProps) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [compressionOptions, setCompressionOptions] = useState<CompressionOptions>({
    strategy: 'balanced',
    preserveRecentMessages: true,
    targetReduction: 40
  });
  
  // Initialize advanced token estimator and semantic compressor
  const tokenEstimator = useMemo(() => new AdvancedTokenEstimator(), []);
  const semanticCompressor = useMemo(() => new SemanticCompressor(), []);

  // Calculate token usage with advanced estimation
  const tokenInfo = useMemo(() => {
    // Convert messages for compatibility
    const uiMessages: UIMessage[] = messages.map((msg, index) => ({
      ...msg,
      id: msg.id || `temp-${index}`,
      parts: msg.parts || (msg.content ? [{ type: 'text', text: msg.content }] : []),
    }));

    // Use advanced token estimation
    const breakdown = tokenEstimator.getDetailedBreakdown(uiMessages, 'gpt-3.5-turbo');
    
    // Calculate usage percentage
    const usagePercentage = Math.min(100, (breakdown.totalTokens / maxCollapsedMessagesSize) * 100);
    
    return {
      ...breakdown,
      usagePercentage,
      isWarning: breakdown.totalTokens > maxCollapsedMessagesSize,
      isCritical: breakdown.totalTokens > maxCollapsedMessagesSize * 1.5,
      potentialSavings: calculatePotentialSavings(uiMessages, compressionOptions)
    };
  }, [messages, maxCollapsedMessagesSize, tokenEstimator, compressionOptions]);

  // Compression function with semantic analysis
  const compressContext = useCallback(async () => {
    if (!setMessages || isCompressing) return;
    
    setIsCompressing(true);
    setCompressionProgress(0);
    
    try {
      const uiMessages: UIMessage[] = messages.map((msg, index) => ({
        ...msg,
        id: msg.id || `temp-${index}`,
        parts: msg.parts || (msg.content ? [{ type: 'text', text: msg.content }] : []),
      }));

      // Convert strategy to target token count
      const targetTokens = Math.floor(
        tokenInfo.totalTokens * (1 - compressionOptions.targetReduction / 100)
      );

      setCompressionProgress(25);
      
      // Apply semantic compression
      const compressedContext = await semanticCompressor.compressContext(
        uiMessages,
        targetTokens,
        compressionOptions.strategy
      );
      
      setCompressionProgress(75);
      
      // Convert back to Message format
      const compressedMessages: Message[] = compressedContext.messages.map((uiMsg) => {
        const { parts, ...rest } = uiMsg;
        return {
          ...rest,
          content: parts
            ?.filter(part => part.type === 'text')
            ?.map(part => (part as any).text)
            ?.join(' ') || uiMsg.content || '',
          parts: parts,
        };
      });
      
      setCompressionProgress(100);
      
      // Update messages
      setTimeout(() => {
        setMessages(compressedMessages);
        setIsCompressing(false);
        setCompressionProgress(0);
      }, 500);
      
    } catch (error) {
      console.error('Error compressing context:', error);
      setIsCompressing(false);
      setCompressionProgress(0);
    }
  }, [messages, setMessages, isCompressing, tokenInfo.totalTokens, semanticCompressor, compressionOptions]);

  // Get status information for UI
  const getStatusInfo = () => {
    if (tokenInfo.isCritical) {
      return {
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-900 dark:text-red-100',
        accentColor: 'bg-red-600',
        statusText: 'Critical',
        description: 'Context exceeds optimal limits'
      };
    } else if (tokenInfo.isWarning) {
      return {
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        textColor: 'text-amber-900 dark:text-amber-100',
        accentColor: 'bg-amber-600',
        statusText: 'Warning',
        description: 'Context approaching limits'
      };
    }
    return {
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-900 dark:text-emerald-100',
      accentColor: 'bg-emerald-600',
      statusText: 'Optimal',
      description: 'Context within optimal range'
    };
  };

  const statusInfo = getStatusInfo();

  // Calculate potential savings information
  const potentialSavings = tokenInfo.potentialSavings;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Context Control Panel */}
      <div 
        className={`flex items-center justify-between p-3 ${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-lg transition-all duration-200`}
        role="region"
        aria-label="Context management controls"
      >
        {/* Token Usage Display */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div 
              className={`w-2 h-2 rounded-full ${statusInfo.accentColor}`}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <span 
                className={`text-sm font-semibold ${statusInfo.textColor}`}
                aria-label={`Total tokens: ${tokenInfo.totalTokens.toLocaleString()}`}
              >
                {tokenInfo.totalTokens.toLocaleString()} tokens
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {statusInfo.statusText}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-40">
            <div 
              className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(tokenInfo.usagePercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Token usage: ${Math.round(tokenInfo.usagePercentage)}%`}
            >
              <div
                className={`h-full ${statusInfo.accentColor} transition-all duration-500 ease-out`}
                style={{ width: `${tokenInfo.usagePercentage}%` }}
              />
            </div>
          </div>

          {/* Compression Stats */}
          {potentialSavings && (
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <span className="font-medium text-green-600 dark:text-green-400">
                -{potentialSavings.percentage}% possible
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Info Button */}
          <button
            className={`p-1.5 rounded-md ${statusInfo.bgColor} hover:bg-opacity-80 transition-colors`}
            aria-label="Context information"
            title="Context usage details"
          >
            <InfoCircledIcon className="w-4 h-4" />
          </button>

          {/* Advanced Options Toggle */}
          <button
            className={`p-1.5 rounded-md ${statusInfo.bgColor} hover:bg-opacity-80 transition-colors`}
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            aria-expanded={showAdvancedOptions}
            aria-label="Advanced compression options"
          >
            <ChevronDownIcon 
              className={`w-4 h-4 transition-transform duration-200 ${
                showAdvancedOptions ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Compress Button */}
          {setMessages && (
            <Button
              variant="neutral"
              size="sm"
              onClick={compressContext}
              disabled={isCompressing || tokenInfo.usagePercentage < 70}
              className="whitespace-nowrap"
              aria-describedby="compress-description"
            >
              {isCompressing ? (
                <span className="flex items-center">
                  <span className="h-3 w-3 rounded-full bg-current animate-pulse mr-2"></span>
                  Compressing...
                </span>
              ) : (
                <span className="flex items-center">
                  <ResetIcon className="w-4 h-4 mr-1" />
                  Compress
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Compression Progress */}
      {isCompressing && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Optimizing context...
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {compressionProgress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${compressionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Advanced Compression Options */}
      {showAdvancedOptions && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Advanced Compression Settings
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compression Strategy */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Compression Strategy
              </label>
              <select
                value={compressionOptions.strategy}
                onChange={(e) => setCompressionOptions(prev => ({
                  ...prev,
                  strategy: e.target.value as RetentionStrategy
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="conservative">Conservative - Preserve more context</option>
                <option value="balanced">Balanced - Optimal compression</option>
                <option value="aggressive">Aggressive - Maximum reduction</option>
              </select>
            </div>

            {/* Target Reduction */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Reduction: {compressionOptions.targetReduction}%
              </label>
              <input
                type="range"
                min="20"
                max="80"
                value={compressionOptions.targetReduction}
                onChange={(e) => setCompressionOptions(prev => ({
                  ...prev,
                  targetReduction: parseInt(e.target.value)
                }))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>20%</span>
                <span>80%</span>
              </div>
            </div>
          </div>

          {/* Options Description */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p id="compress-description">
              Context compression removes redundant information while preserving important details and conversation flow.
              Higher compression may affect response quality but reduces token usage and costs.
            </p>
          </div>
        </div>
      )}

      {/* Quality Metrics */}
      {tokenInfo.potentialSavings && (
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Estimated savings: {tokenInfo.potentialSavings.tokens} tokens 
          ({tokenInfo.potentialSavings.percentage}% reduction)
        </div>
      )}
    </div>
  );
};

// Helper function to calculate potential savings
function calculatePotentialSavings(messages: UIMessage[], options: CompressionOptions) {
  if (messages.length <= 3) return null; // Don't compress short conversations
  
  // Simple estimation based on message redundancy
  let redundancyScore = 0;
  const recentMessages = messages.slice(-6);
  
  for (let i = 1; i < recentMessages.length; i++) {
    const prev = recentMessages[i - 1];
    const curr = recentMessages[i];
    
    // Check for similar content patterns
    if (prev.content && curr.content) {
      const similarity = calculateSimilarity(prev.content, curr.content);
      redundancyScore += similarity * 0.1;
    }
  }
  
  // Apply compression options
  let estimatedReduction = Math.min(redundancyScore * 100, options.targetReduction);
  
  // Cap aggressive reduction
  if (options.strategy === 'aggressive') {
    estimatedReduction = Math.max(estimatedReduction, 30);
  } else if (options.strategy === 'conservative') {
    estimatedReduction = Math.min(estimatedReduction, 25);
  }
  
  // Calculate token savings
  const totalTokens = messages.reduce((sum, msg) => sum + (msg.content?.length || 0) / 4, 0);
  const savedTokens = Math.floor(totalTokens * estimatedReduction / 100);
  
  return {
    tokens: savedTokens,
    percentage: Math.round(estimatedReduction)
  };
}

// Simple text similarity calculation
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return intersection.length / union.length;
}