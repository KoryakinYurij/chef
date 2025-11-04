import { type Message, type UIMessage } from 'ai';
import { useMemo } from 'react';
import { ChatContextManager } from 'chef-agent/ChatContextManager';

interface TokenCounterProps {
  messages: Message[];
  maxCollapsedMessagesSize: number;
  minCollapsedMessagesSize: number;
}

export const TokenCounter = ({ messages, maxCollapsedMessagesSize, minCollapsedMessagesSize }: TokenCounterProps) => {
  const tokenInfo = useMemo(() => {
    // Create temporary ChatContextManager for size calculation
    const mockContextManager = new ChatContextManager(
      () => undefined,
      () => ({}),
      () => new Map()
    );
    
    // Convert Message[] to UIMessage[] for ChatContextManager compatibility
    // Add parts to messages if they don't exist
    const uiMessages: UIMessage[] = messages.map((msg, index) => ({
      ...msg,
      id: msg.id || `temp-${index}`,
      parts: msg.parts || (msg.content ? [{ type: 'text', text: msg.content }] : []),
    }));
    
    // Calculate message sizes
    const characterCounts = mockContextManager.calculatePromptCharacterCounts(uiMessages);
    
    // More accurate token estimation (approximately 1 token ≈ 4 characters for English text)
    const estimatedTokens = Math.floor(characterCounts.totalPromptChars / 4);
    const historyTokens = Math.floor(characterCounts.messageHistoryChars / 4);
    const currentTurnTokens = Math.floor(characterCounts.currentTurnChars / 4);
    
    // Define thresholds for color indicators (WCAG AA compliant colors)
    const tokenThreshold = maxCollapsedMessagesSize;
    const criticalThreshold = maxCollapsedMessagesSize * 1.5;
    
    // Calculate percentage for progress bar
    const usagePercentage = Math.min(100, (estimatedTokens / criticalThreshold) * 100);
    
    return {
      totalChars: characterCounts.totalPromptChars,
      historyChars: characterCounts.messageHistoryChars,
      currentTurnChars: characterCounts.currentTurnChars,
      estimatedTokens,
      historyTokens,
      currentTurnTokens,
      tokenThreshold,
      criticalThreshold,
      usagePercentage,
      isWarning: estimatedTokens > tokenThreshold,
      isCritical: estimatedTokens > criticalThreshold,
    };
  }, [messages, maxCollapsedMessagesSize, minCollapsedMessagesSize]);

  // WCAG AA compliant color combinations with sufficient contrast
  const getStatusInfo = () => {
    if (tokenInfo.isCritical) {
      return {
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-900 dark:text-red-100',
        accentColor: 'bg-red-600',
        statusText: 'Critical',
        description: 'Context size exceeds recommended limits'
      };
    } else if (tokenInfo.isWarning) {
      return {
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        textColor: 'text-amber-900 dark:text-amber-100',
        accentColor: 'bg-amber-600',
        statusText: 'Warning',
        description: 'Context size approaching limits'
      };
    }
    return {
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-900 dark:text-emerald-100',
      accentColor: 'bg-emerald-600',
      statusText: 'Optimal',
      description: 'Context size within optimal range'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={`flex items-center justify-between p-2.5 ${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-lg transition-colors duration-200`}
      role="region"
      aria-label="Token usage information"
    >
      {/* Compact Token Count Display */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${statusInfo.accentColor}`}
            aria-hidden="true"
          />
          <span
            className={`text-sm font-semibold ${statusInfo.textColor}`}
            aria-label={`Total tokens: ${tokenInfo.estimatedTokens.toLocaleString()}`}
          >
            {tokenInfo.estimatedTokens.toLocaleString()} tokens
          </span>
        </div>
        
        <div
          className="text-xs font-medium text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        >
          {statusInfo.statusText}
        </div>
      </div>

      {/* Compact Progress Bar with Better Accessibility */}
      <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-32">
        <div
          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(tokenInfo.usagePercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Token usage: ${Math.round(tokenInfo.usagePercentage)}%`}
        >
          <div
            className={`h-full ${statusInfo.accentColor} transition-all duration-300 ease-out`}
            style={{ width: `${tokenInfo.usagePercentage}%` }}
          />
        </div>
        
        {/* Percentage indicator for screen readers */}
        <span
          className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right"
          aria-hidden="true"
        >
          {Math.round(tokenInfo.usagePercentage)}%
        </span>
      </div>

      {/* Detailed breakdown on hover/focus - Tooltip approach */}
      <div className="relative group">
        <button
          className={`text-xs font-medium ${statusInfo.textColor} hover:underline focus:outline-none focus:underline`}
          aria-describedby="token-breakdown"
          tabIndex={0}
        >
          Details
        </button>
        
        <div
          id="token-breakdown"
          className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-focus:opacity-100 group-hover:visible group-focus:visible transition-all duration-200 z-10"
          role="tooltip"
        >
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">History:</span>
              <span className={`font-medium ${statusInfo.textColor}`}>
                {tokenInfo.historyTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Current:</span>
              <span className={`font-medium ${statusInfo.textColor}`}>
                {tokenInfo.currentTurnTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Total:</span>
              <span className={`font-bold ${statusInfo.textColor}`}>
                {tokenInfo.estimatedTokens.toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Arrow pointing to button */}
          <div className="absolute top-full right-4 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45 -mt-1" />
        </div>
      </div>
    </div>
  );
};