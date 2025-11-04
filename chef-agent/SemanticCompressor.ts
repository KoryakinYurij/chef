import { type ToolInvocation, type UIMessage } from 'ai';

export type RetentionStrategy = 'conservative' | 'balanced' | 'aggressive';

export interface MessageRelevance {
  messageId: string;
  relevanceScore: number;
  semanticClusters: string[];
  retentionPriority: 'high' | 'medium' | 'low';
  preservedContent: string[];
  compressedContent?: string;
}

export interface CompressedContext {
  messages: UIMessage[];
  qualityScore: number;
  compressionRatio: number;
  preservedEntities: string[];
  metadata: {
    originalMessageCount: number;
    compressedMessageCount: number;
    semanticClusterCount: number;
  };
}

export interface TokenBreakdown {
  totalTokens: number;
  messageTokens: number[];
  systemTokens: number;
  currentTurnTokens: number;
  model: string;
  accuracy: 'high' | 'medium' | 'low';
}

/**
 * Advanced semantic compressor using modern 2025 approaches
 * Implements multi-level context compression with semantic relevance scoring
 */
export class SemanticCompressor {
  private retentionThresholds = {
    conservative: { high: 0.8, medium: 0.5 },
    balanced: { high: 0.7, medium: 0.4 },
    aggressive: { high: 0.6, medium: 0.3 }
  };

  private entityPatterns = {
    code: /(?:```[\s\S]*?```|`[^`]+`|function\s+\w+|\w+\s*=\s*|\w+\.\w+\s*\(|class\s+\w+)/g,
    file: /([A-Za-z0-9_-]+\.(?:js|ts|tsx|jsx|py|java|cpp|c|go|rs|php|rb|swift|kt|scala|r|sql|html|css|scss|less|json|yaml|yml|xml|md|txt|log))/g,
    url: /(https?:\/\/[^\s]+|www\.[^\s]+)/g,
    variable: /\b[A-Z_][A-Z0-9_]*\b/g,
    function: /\b\w+(?=\s*\()/g
  };

  constructor(
    private embeddingModel?: (text: string) => Promise<number[]>,
    private tokenizer?: (text: string) => Promise<string[]>
  ) {}

  /**
   * Main compression function with semantic relevance filtering
   */
  async compressContext(
    messages: UIMessage[],
    targetTokenCount: number,
    retentionStrategy: RetentionStrategy = 'balanced'
  ): Promise<CompressedContext> {
    const originalCount = messages.length;
    const startTime = performance.now();
    
    // Calculate semantic relevance scores
    const relevanceScores = await this.calculateRelevanceScores(messages);
    
    // Group messages into semantic clusters
    const clusters = this.createSemanticClusters(messages, relevanceScores);
    
    // Apply retention strategy
    const filteredMessages = this.applyRetentionStrategy(clusters, retentionStrategy);
    
    // Preserve important entities and compress content
    const preservedMessages = await this.preserveAndCompress(filteredMessages);
    
    // Calculate quality metrics
    const qualityScore = await this.calculateQualityScore(messages, preservedMessages);
    const compressionRatio = preservedMessages.length / originalCount;
    
    const compressionTime = performance.now() - startTime;
    console.log(`Context compression completed: ${compressionRatio.toFixed(2)} ratio, ${qualityScore.toFixed(2)} quality, ${compressionTime.toFixed(0)}ms`);
    
    return {
      messages: preservedMessages,
      qualityScore,
      compressionRatio,
      preservedEntities: this.extractAllEntities(messages),
      metadata: {
        originalMessageCount: originalCount,
        compressedMessageCount: preservedMessages.length,
        semanticClusterCount: clusters.size
      }
    };
  }

  /**
   * Calculate semantic relevance scores for messages
   */
  private async calculateRelevanceScores(messages: UIMessage[]): Promise<MessageRelevance[]> {
    const currentContext = this.extractCurrentContext(messages);
    const relevanceScores: MessageRelevance[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const content = this.extractMessageContent(message);
      
      // Calculate semantic similarity
      const similarity = await this.calculateSemanticSimilarity(content, currentContext);
      
      // Extract semantic clusters
      const clusters = this.extractSemanticClusters(content);
      
      // Extract and preserve important entities
      const entities = this.extractImportantEntities(content);
      
      // Determine retention priority
      const priority = this.determineRetentionPriority(similarity, message, i, messages.length);
      
      relevanceScores.push({
        messageId: message.id,
        relevanceScore: similarity,
        semanticClusters: clusters,
        retentionPriority: priority,
        preservedContent: entities
      });
    }
    
    return relevanceScores;
  }

  /**
   * Create semantic clusters from messages and relevance scores
   */
  private createSemanticClusters(
    messages: UIMessage[],
    relevanceScores: MessageRelevance[]
  ): Map<string, { messages: UIMessage[]; relevance: MessageRelevance[] }> {
    const clusters = new Map<string, { messages: UIMessage[]; relevance: MessageRelevance[] }>();
    
    messages.forEach((message, index) => {
      const relevance = relevanceScores[index];
      const dominantCluster = relevance.semanticClusters[0] || 'general';
      
      if (!clusters.has(dominantCluster)) {
        clusters.set(dominantCluster, { messages: [], relevance: [] });
      }
      
      clusters.get(dominantCluster)!.messages.push(message);
      clusters.get(dominantCluster)!.relevance.push(relevance);
    });
    
    return clusters;
  }

  /**
   * Apply retention strategy to filter messages
   */
  private applyRetentionStrategy(
    clusters: Map<string, { messages: UIMessage[]; relevance: MessageRelevance[] }>,
    strategy: RetentionStrategy
  ): UIMessage[] {
    const thresholds = this.retentionThresholds[strategy];
    const filteredMessages: UIMessage[] = [];
    
    // Always preserve recent messages (last 3)
    const recentMessages: UIMessage[] = [];
    const recentRelevance: MessageRelevance[] = [];
    
    clusters.forEach(cluster => {
      const end = cluster.messages.length;
      for (let i = Math.max(0, end - 3); i < end; i++) {
        recentMessages.push(cluster.messages[i]);
        recentRelevance.push(cluster.relevance[i]);
      }
    });
    
    // Filter clusters based on relevance thresholds
    clusters.forEach(cluster => {
      cluster.messages.forEach((message, index) => {
        const relevance = cluster.relevance[index];
        
        // Always include high-priority messages
        if (relevance.retentionPriority === 'high' || relevance.relevanceScore >= thresholds.high) {
          filteredMessages.push(message);
        }
        // Include medium-priority messages if they contribute unique entities
        else if (relevance.retentionPriority === 'medium' || relevance.relevanceScore >= thresholds.medium) {
          if (this.hasUniqueEntities(relevance.preservedContent, filteredMessages)) {
            filteredMessages.push(message);
          }
        }
        // Low-priority messages are typically skipped in aggressive compression
      });
    });
    
    // Add recent messages (preserving chronological order)
    const allMessages = [...filteredMessages, ...recentMessages];
    return this.removeDuplicates(allMessages);
  }

  /**
   * Preserve important entities and compress content
   */
  private async preserveAndCompress(messages: UIMessage[]): Promise<UIMessage[]> {
    const compressedMessages: UIMessage[] = [];
    
    for (const message of messages) {
      const compressedMessage = { ...message };
      
      // Preserve important entities in content
      if (message.content) {
        compressedMessage.content = await this.compressContent(message.content, message.role);
      }
      
      // Compress and preserve parts
      if (message.parts) {
        compressedMessage.parts = await Promise.all(
          message.parts.map(part => this.compressPart(part))
        );
      }
      
      compressedMessages.push(compressedMessage);
    }
    
    return compressedMessages;
  }

  /**
   * Compress individual message content while preserving semantic meaning
   */
  private async compressContent(content: string, role: string): Promise<string> {
    if (role === 'assistant') {
      // For assistant messages, preserve code and structured data
      return this.compressAssistantContent(content);
    } else {
      // For user messages, preserve intent and key details
      return this.compressUserContent(content);
    }
  }

  /**
   * Compress assistant messages (preserve code, compress verbose explanations)
   */
  private compressAssistantContent(content: string): string {
    let compressed = content;
    
    // Preserve code blocks
    const codeBlocks = compressed.match(/```[\s\S]*?```/g) || [];
    
    // Compress verbose explanations but keep technical content
    compressed = compressed
      // Remove redundant phrases
      .replace(/\b(as mentioned earlier|as we discussed|in conclusion|to summarize|basically|essentially)\b/gi, '')
      // Compress filler words
      .replace(/\b(really|very|actually|basically|simply|just|obviously|clearly|definitely)\s+/gi, '')
      // Remove excessive whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      compressed = compressed.replace(`[CODE_BLOCK_${index}]`, block);
    });
    
    return compressed;
  }

  /**
   * Compress user messages (preserve intent and key details)
   */
  private compressUserContent(content: string): string {
    let compressed = content;
    
    // Preserve specific requests and requirements
    const preservedTerms = this.extractImportantTerms(content);
    
    // Remove redundant polite phrases
    compressed = compressed
      .replace(/\b(please|could you|would you|can you|thank you|thanks)\b/gi, '')
      .replace(/\b(i would like to|i want to|i need to|it would be great if)\b/gi, 'want to')
      .trim();
    
    return compressed;
  }

  /**
   * Compress message parts while preserving functionality
   */
  private async compressPart(part: any): Promise<any> {
    const compressedPart = { ...part };
    
    switch (part.type) {
      case 'text':
        if (part.text) {
          compressedPart.text = await this.compressContent(part.text, 'user');
        }
        break;
      case 'tool-invocation':
        // Preserve tool invocations but compress verbose results
        if (part.toolInvocation?.result && typeof part.toolInvocation.result === 'string') {
          const result = part.toolInvocation.result;
          if (result.length > 200) {
            // Summarize long tool results
            compressedPart.toolInvocation = {
              ...part.toolInvocation,
              result: this.summarizeToolResult(result)
            };
          }
        }
        break;
    }
    
    return compressedPart;
  }

  /**
   * Calculate semantic similarity between texts
   */
  private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    // Simple keyword-based similarity (can be enhanced with actual embeddings)
    const words1 = this.extractKeywords(text1.toLowerCase());
    const words2 = this.extractKeywords(text2.toLowerCase());
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Extract current conversation context for relevance calculation
   */
  private extractCurrentContext(messages: UIMessage[]): string {
    // Get the last few user messages and recent assistant responses
    const recentMessages = messages.slice(-6);
    return recentMessages
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && this.isTechnicalContent(msg.content)))
      .map(msg => msg.content || '')
      .join(' ');
  }

  /**
   * Extract semantic clusters from content
   */
  private extractSemanticClusters(content: string): string[] {
    const clusters: string[] = [];
    
    // Programming-related clusters
    if (this.entityPatterns.code.test(content)) clusters.push('code');
    if (this.entityPatterns.file.test(content)) clusters.push('files');
    if (content.includes('error') || content.includes('bug')) clusters.push('debugging');
    if (content.includes('function') || content.includes('class')) clusters.push('architecture');
    
    // Web development clusters
    if (content.includes('component') || content.includes('React') || content.includes('Vue')) clusters.push('frontend');
    if (content.includes('API') || content.includes('database') || content.includes('server')) clusters.push('backend');
    if (content.includes('CSS') || content.includes('HTML') || content.includes('responsive')) clusters.push('styling');
    
    return clusters.length > 0 ? clusters : ['general'];
  }

  /**
   * Extract important entities from content
   */
  private extractImportantEntities(content: string): string[] {
    const entities: string[] = [];
    
    Object.entries(this.entityPatterns).forEach(([type, pattern]) => {
      const matches = content.match(pattern) || [];
      entities.push(...matches);
    });
    
    return [...new Set(entities)];
  }

  /**
   * Determine retention priority based on relevance and message position
   */
  private determineRetentionPriority(
    similarity: number,
    message: UIMessage,
    index: number,
    totalMessages: number
  ): 'high' | 'medium' | 'low' {
    // Recent messages get higher priority
    const recencyBoost = Math.max(0, (totalMessages - index) / totalMessages);
    
    // Tool results and errors get higher priority
    const contentImportance = this.calculateContentImportance(message);
    
    const combinedScore = similarity * 0.6 + recencyBoost * 0.3 + contentImportance * 0.1;
    
    if (combinedScore > 0.7) return 'high';
    if (combinedScore > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calculate content importance score
   */
  private calculateContentImportance(message: UIMessage): number {
    let score = 0;
    
    if (message.role === 'assistant') {
      score += 0.3; // Tool interactions are important
    }
    
    // Check if message has tool invocations
    if (message.parts?.some(part => part.type === 'tool-invocation')) {
      score += 0.3;
    }
    
    if (this.hasCode(message.content)) score += 0.3;
    if (this.hasErrors(message.content)) score += 0.4;
    if (this.hasConfiguration(message.content)) score += 0.2;
    
    return Math.min(score, 1);
  }

  /**
   * Check if content has unique entities compared to existing messages
   */
  private hasUniqueEntities(entities: string[], existingMessages: UIMessage[]): boolean {
    const existingEntities = new Set<string>();
    existingMessages.forEach(msg => {
      this.extractImportantEntities(msg.content || '').forEach(entity => existingEntities.add(entity));
    });
    
    return entities.some(entity => !existingEntities.has(entity));
  }

  /**
   * Remove duplicate messages while preserving order
   */
  private removeDuplicates(messages: UIMessage[]): UIMessage[] {
    const seen = new Set<string>();
    return messages.filter(message => {
      const key = `${message.role}:${message.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate quality score comparing original and compressed messages
   */
  private async calculateQualityScore(original: UIMessage[], compressed: UIMessage[]): Promise<number> {
    // Simple quality metrics based on entity preservation and semantic similarity
    const originalEntities = this.extractAllEntities(original);
    const compressedEntities = this.extractAllEntities(compressed);
    
    const entityPreservation = compressedEntities.length / originalEntities.length;
    
    // Bonus for preserving recent context
    const recencyBonus = Math.min(0.1, (compressed.length / original.length) * 0.1);
    
    return Math.min(entityPreservation + recencyBonus, 1.0);
  }

  /**
   * Extract all entities from messages
   */
  private extractAllEntities(messages: UIMessage[]): string[] {
    const allEntities: string[] = [];
    messages.forEach(message => {
      allEntities.push(...this.extractImportantEntities(message.content || ''));
    });
    return [...new Set(allEntities)];
  }

  // Utility methods for content analysis
  private extractKeywords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
    return stopWords.includes(word.toLowerCase());
  }

  private isTechnicalContent(content?: string): boolean {
    if (!content) return false;
    return this.hasCode(content) || this.hasConfiguration(content) || this.hasErrors(content);
  }

  private hasCode(content?: string): boolean {
    return !!(content && (content.includes('```') || this.entityPatterns.code.test(content)));
  }

  private hasErrors(content?: string): boolean {
    return !!(content && (content.toLowerCase().includes('error') || content.toLowerCase().includes('exception')));
  }

  private hasConfiguration(content?: string): boolean {
    return !!(content && (content.includes('config') || content.includes('setting') || content.includes('option')));
  }

  private extractMessageContent(message: UIMessage): string {
    let content = message.content || '';
    if (message.parts) {
      content += message.parts.map(part => part.type === 'text' ? part.text : '').join(' ');
    }
    return content;
  }

  private summarizeToolResult(result: string): string {
    // Simple summarization for tool results
    if (result.length <= 200) return result;
    
    const lines = result.split('\n');
    const importantLines = lines.filter(line => 
      line.includes('Error:') || 
      line.includes('Success:') || 
      line.includes('Created:') ||
      line.includes('Updated:') ||
      line.length > 50
    );
    
    if (importantLines.length === 0) {
      return result.substring(0, 150) + '...';
    }
    
    return importantLines.join('\n');
  }

  private extractImportantTerms(content: string): string[] {
    const terms: string[] = [];
    
    // Extract specific technical terms
    const patterns = [
      /(?:create|build|implement|add|update|fix|modify)\s+(\w+)/gi,
      /(?:use|implement|add)\s+(\w+(?:\s+\w+)*)/gi,
      /(?:problem|issue|bug|error)\s*:?\s*([^.]+)/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        terms.push(match[1].trim());
      }
    });
    
    return terms;
  }
}

/**
 * Advanced token estimator with multi-model support
 */
export class AdvancedTokenEstimator {
  private tokenizers = new Map<string, (text: string) => number>();

  constructor() {
    // Initialize with common model tokenizers
    this.tokenizers.set('gpt-3.5-turbo', (text: string) => this.estimateGPTTokens(text));
    this.tokenizers.set('gpt-4', (text: string) => this.estimateGPTTokens(text));
    this.tokenizers.set('claude-3', (text: string) => this.estimateClaudeTokens(text));
  }

  estimateTokens(text: string, model: string = 'gpt-3.5-turbo'): number {
    const tokenizer = this.tokenizers.get(model) || this.estimateGPTTokens;
    return tokenizer(text);
  }

  private estimateGPTTokens(text: string): number {
    // More accurate token estimation for GPT models
    // Approximately 4 characters per token for English text
    let tokenCount = 0;
    
    // Handle different content types
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.trim() === '') {
        tokenCount += 0.5; // Empty lines still count
        continue;
      }
      
      // Code blocks get special handling
      if (line.startsWith('```')) {
        tokenCount += 1;
        continue;
      }
      
      // Regular text
      const words = line.trim().split(/\s+/);
      tokenCount += words.length * 0.75; // More accurate ratio
      
      // Add punctuation tokens
      const punctuation = line.match(/[.,!?;:'"()[\]{}]/g);
      if (punctuation) {
        tokenCount += punctuation.length * 0.1;
      }
    }
    
    return Math.ceil(tokenCount);
  }

  private estimateClaudeTokens(text: string): number {
    // Claude typically has slightly different token ratios
    return Math.ceil(text.length / 3.8);
  }

  getDetailedBreakdown(messages: UIMessage[], model: string = 'gpt-3.5-trokken'): TokenBreakdown {
    const messageTokens: number[] = [];
    let systemTokens = 0;
    let currentTurnTokens = 0;
    
    messages.forEach((message, index) => {
      const content = this.extractMessageContent(message);
      const tokens = this.estimateTokens(content, model);
      messageTokens.push(tokens);
      
      if (message.role === 'system') {
        systemTokens += tokens;
      } else if (index === messages.length - 1 && message.role === 'user') {
        currentTurnTokens = tokens;
      }
    });
    
    const totalTokens = messageTokens.reduce((sum, tokens) => sum + tokens, 0);
    
    return {
      totalTokens,
      messageTokens,
      systemTokens,
      currentTurnTokens,
      model,
      accuracy: this.determineAccuracy(model)
    };
  }

  private extractMessageContent(message: UIMessage): string {
    let content = message.content || '';
    if (message.parts) {
      content += message.parts.map(part => part.type === 'text' ? part.text : '').join(' ');
    }
    return content;
  }

  private determineAccuracy(model: string): 'high' | 'medium' | 'low' {
    const accurateModels = ['gpt-4', 'claude-3'];
    return accurateModels.includes(model) ? 'high' : 'medium';
  }
}