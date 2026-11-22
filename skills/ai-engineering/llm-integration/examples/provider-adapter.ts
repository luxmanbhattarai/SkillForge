export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: "stop" | "length" | "tool_calls" | "filtered";
}

export interface LlmClient {
  complete(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<CompletionResult>;
  completeJson<T>(messages: ChatMessage[], schema: object): Promise<T>;
}
