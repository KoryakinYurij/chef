import { type Message, type UIMessage } from 'ai';
import { useCallback, useState, useEffect } from 'react';
import { ChatContextManager } from 'chef-agent/ChatContextManager';
import { useLaunchDarkly } from '~/lib/hooks/useLaunchDarkly';
import { Button } from '@ui/Button';
import { ResetIcon } from '@radix-ui/react-icons';

interface ContextCompressorProps {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  maxCollapsedMessagesSize: number;
  minCollapsedMessagesSize: number;
}

export const ContextCompressor = ({
  messages,
  setMessages,
  maxCollapsedMessagesSize,
  minCollapsedMessagesSize
}: ContextCompressorProps) => {
  const { maxCollapsedMessagesSize: ldMaxSize, minCollapsedMessagesSize: ldMinSize } = useLaunchDarkly();
  const [isCompressing, setIsCompressing] = useState(false);
  const [hasExceededThreshold, setHasExceededThreshold] = useState(false);

 // Используем значения из LaunchDarkly, если они доступны, иначе значения из пропсов
  const actualMaxSize = ldMaxSize ?? maxCollapsedMessagesSize;
  const actualMinSize = ldMinSize ?? minCollapsedMessagesSize;

  // Подсчет примерного количества токенов
  const estimateTokens = useCallback((messages: Message[]): number => {
    // Создаем временный экземпляр ChatContextManager для подсчета размеров
    const mockContextManager = new ChatContextManager(
      () => undefined,
      () => ({}),
      () => new Map()
    );
    
    // Преобразуем Message[] в UIMessage[] для совместимости с ChatContextManager
    const uiMessages = messages.map((msg, index) => ({
      ...msg,
      id: msg.id || `temp-${index}`,
      parts: msg.parts || (msg.content ? [{ type: 'text', text: msg.content }] : []),
    }));
    
    const characterCounts = mockContextManager.calculatePromptCharacterCounts(uiMessages);
    // Приблизительная оценка количества токенов (обычно 1 токен ≈ 4 символа для английского текста)
    return Math.floor(characterCounts.totalPromptChars / 4);
  }, []);

  // Проверяем, нужно ли автоматическое сжатие
 const needsAutoCompression = estimateTokens(messages) > actualMaxSize * 1.5; // Устанавливаем порог на 1.5 от максимального размера
  
  // Обновляем состояние при превышении порога
  useEffect(() => {
    if (needsAutoCompression && !hasExceededThreshold) {
      setHasExceededThreshold(true);
    }
  }, [needsAutoCompression, hasExceededThreshold]);

  // Функция сжатия контекста
  const compressContext = useCallback(async () => {
    setIsCompressing(true);
    
    try {
      // Создаем экземпляр ChatContextManager
      const contextManager = new ChatContextManager(
        () => undefined,
        () => ({}),
        () => new Map()
      );
      
      // Преобразуем Message[] в UIMessage[] для совместимости с prepareContext
      const uiMessages = messages.map((msg, index) => ({
        ...msg,
        id: msg.id || `temp-${index}`,
        parts: msg.parts || (msg.content ? [{ type: 'text', text: msg.content }] : []),
      }));
      
      // Подготавливаем контекст с агрессивным сжатием
      const { messages: compressedUIMessages } = contextManager.prepareContext(
        uiMessages,
        actualMinSize, // Используем минимальный размер для агрессивного сжатия
        actualMinSize
      );
      
      // Преобразуем обратно в Message[] для совместимости с остальной системой
      const compressedMessages = compressedUIMessages.map((uiMsg) => {
        const { parts, ...rest } = uiMsg;
        return {
          ...rest,
          content: parts
            .filter(part => part.type === 'text')
            .map(part => (part as any).text)
            .join(' '),
          parts: parts,
        };
      });
      
      // Обновляем сообщения
      setMessages(compressedMessages);
      // Сбрасываем флаг превышения порога после сжатия
      setHasExceededThreshold(false);
    } catch (error) {
      console.error('Error compressing context:', error);
    } finally {
      setIsCompressing(false);
    }
  }, [messages, setMessages, actualMinSize]);

  // Обработчик ручного сжатия
  const handleManualCompress = useCallback(() => {
    compressContext();
  }, [compressContext]);

  // Показываем предупреждение, если превышен порог
  const showWarning = hasExceededThreshold && !isCompressing;

  return (
    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-90/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
      <div className="text-sm text-yellow-800 dark:text-yellow-200">
        {showWarning
          ? 'Context size is very large. Please compress to continue.'
          : `Context compression available. Current size: ~${estimateTokens(messages).toLocaleString()} tokens`}
      </div>
      <Button
        variant="neutral"
        size="sm"
        onClick={handleManualCompress}
        disabled={isCompressing}
        tip="Compress chat context"
      >
        {isCompressing ? (
          <span className="flex items-center">
            <span className="h-3 w-3 rounded-full bg-current animate-pulse mr-1"></span>
            Compressing...
          </span>
        ) : (
          <span className="flex items-center">
            <ResetIcon className="size-4 mr-1" />
            Compress
          </span>
        )}
      </Button>
    </div>
  );
};