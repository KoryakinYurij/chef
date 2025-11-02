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
    // Создаем временный экземпляр ChatContextManager для подсчета размеров
    const mockContextManager = new ChatContextManager(
      () => undefined,
      () => ({}),
      () => new Map()
    );
    
    // Преобразуем Message[] в UIMessage[] для совместимости с ChatContextManager
    // Добавляем parts к сообщениям, если они отсутствуют
    const uiMessages: UIMessage[] = messages.map((msg, index) => ({
      ...msg,
      id: msg.id || `temp-${index}`,
      parts: msg.parts || (msg.content ? [{ type: 'text', text: msg.content }] : []),
    }));
    
    // Рассчитываем размеры сообщений
    const characterCounts = mockContextManager.calculatePromptCharacterCounts(uiMessages);
    
    // Приблизительная оценка количества токенов (обычно 1 токен ≈ 4 символа для английского текста)
    const estimatedTokens = Math.floor(characterCounts.totalPromptChars / 4);
    const historyTokens = Math.floor(characterCounts.messageHistoryChars / 4);
    const currentTurnTokens = Math.floor(characterCounts.currentTurnChars / 4);
    
    // Определяем пороги для цветового индикатора
    const tokenThreshold = maxCollapsedMessagesSize; // Используем как порог для предупреждения
    const criticalThreshold = maxCollapsedMessagesSize * 1.5; // Критический порог
    
    return {
      totalChars: characterCounts.totalPromptChars,
      historyChars: characterCounts.messageHistoryChars,
      currentTurnChars: characterCounts.currentTurnChars,
      estimatedTokens,
      historyTokens,
      currentTurnTokens,
      tokenThreshold,
      criticalThreshold,
      isWarning: estimatedTokens > tokenThreshold,
      isCritical: estimatedTokens > criticalThreshold,
    };
  }, [messages, maxCollapsedMessagesSize, minCollapsedMessagesSize]);

  // Определяем цвет индикатора
  const indicatorColor = tokenInfo.isCritical
    ? 'bg-red-500'
    : tokenInfo.isWarning
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="flex flex-col gap-1 p-3 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-content-primary">Token Count</span>
        <span className={`text-sm font-bold ${tokenInfo.isCritical ? 'text-red-500' : tokenInfo.isWarning ? 'text-yellow-500' : 'text-green-500'}`}>
          ~{tokenInfo.estimatedTokens.toLocaleString()} tokens
        </span>
      </div>
      <div className="w-full bg-gray-20 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${indicatorColor}`}
          style={{
            width: `${Math.min(100, (tokenInfo.estimatedTokens / tokenInfo.criticalThreshold) * 100)}%`
          }}
        ></div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
        <div className="text-center">
          <div className="text-content-secondary">History</div>
          <div className="font-medium text-content-primary">{tokenInfo.historyTokens.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-content-secondary">Current</div>
          <div className="font-medium text-content-primary">{tokenInfo.currentTurnTokens.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-content-secondary">Total</div>
          <div className="font-medium text-content-primary">{tokenInfo.estimatedTokens.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};