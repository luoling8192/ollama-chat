import type { ModelCapabilities, ModelResponse } from './base'
import type { ModelParameters, Thread } from '~/types'
import { generateText } from '@xsai/generate-text'
import { createOpenAI } from '@xsai/providers'
import { streamText } from '@xsai/stream-text'
import { useSettingsStore } from '~/stores/settings'
import { BaseModelAdapter } from './base'

export class OpenAIAdapter extends BaseModelAdapter {
  id = 'openai'
  name = 'OpenAI'
  capabilities: ModelCapabilities = {
    streaming: true,
    multimodal: true,
    tokenization: true,
    maxTokens: 4096,
    embedding: true,
  }

  constructor(private readonly currentThread?: Thread) {
    super()
  }

  private getClient() {
    const settings = useSettingsStore()
    return createOpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl,
    })
  }

  async generateResponse(
    prompt: string,
    params: ModelParameters,
  ): Promise<ModelResponse> {
    const startTime = Date.now()

    try {
      const openai = this.getClient()
      const { text } = await generateText({
        ...openai.chat(this.currentThread?.metadata.model ?? 'gpt-3.5-turbo'),
        messages: [{ content: prompt, role: 'user' }],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
      })

      return {
        content: text ?? '',
        metadata: {
          tokens: 0,
          processingTime: Date.now() - startTime,
        },
      }
    }
    catch (error) {
      throw new Error('Failed to generate response', { cause: error })
    }
  }

  async *streamResponse(
    prompt: string,
    params: ModelParameters,
  ): AsyncGenerator<ModelResponse> {
    try {
      const openai = this.getClient()
      const { textStream } = await streamText({
        ...openai.chat(this.currentThread?.metadata.model ?? 'gpt-3.5-turbo'),
        messages: [{ content: prompt, role: 'user' }],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
      })

      for await (const textPart of textStream) {
        yield {
          content: textPart ?? '',
          metadata: {
            tokens: 0,
            processingTime: 0,
          },
        }
      }
    }
    catch (error) {
      throw new Error('Failed to stream response', { cause: error })
    }
  }

  async tokenize(text: string): Promise<number> {
    return Math.ceil(text.length / 4)
  }
}
