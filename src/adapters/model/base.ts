import type { Message, ModelParameters } from '~/types'

// 模型适配器基类
export interface ModelCapabilities {
  streaming: boolean
  multimodal: boolean
  tokenization: boolean
  maxTokens: number
  embedding: boolean
}

export interface ModelResponse {
  content: string
  metadata: {
    tokens: number
    processingTime: number
  }
}

export abstract class BaseModelAdapter {
  abstract id: string
  abstract name: string
  abstract capabilities: ModelCapabilities

  abstract generateResponse(
    messages: Message[],
    params: ModelParameters
  ): Promise<ModelResponse>

  abstract streamResponse(
    messages: Message[],
    params: ModelParameters
  ): AsyncIterator<ModelResponse>

  abstract tokenize(text: string): Promise<number>
}
