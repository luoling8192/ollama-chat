import type { ModelCapabilities, ModelResponse } from './base'
import type { Message, ModelParameters, Thread } from '~/types'
import { useLogg } from '@guiiai/logg'
import { generateText } from '@xsai/generate-text'
import { createOpenAI } from '@xsai/providers'
import { streamText } from '@xsai/stream-text'
import { useSettingsStore } from '~/stores/settings'
import { BaseModelAdapter } from './base'

const logger = useLogg('openai').useGlobalConfig()

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
    logger.withFields({ id: this.id }).debug('Initialized OpenAI adapter')
  }

  private getClient() {
    const settings = useSettingsStore()
    return createOpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl,
    })
  }

  async generateResponse(
    messages: Message[],
    params: ModelParameters,
  ): Promise<ModelResponse> {
    const startTime = Date.now()

    try {
      const openai = this.getClient()
      logger.withFields({ model: this.currentThread?.metadata.model }).debug('Generating response')
      const { text } = await generateText({
        ...openai.chat(this.currentThread?.metadata.model ?? 'gpt-3.5-turbo'),
        messages: messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content.value,
        })),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
      })

      const processingTime = Date.now() - startTime
      logger.withFields({ processingTime }).debug('Generated response')

      return {
        content: text ?? '',
        metadata: {
          tokens: 0,
          processingTime,
        },
      }
    }
    catch (error) {
      logger.withFields({ error }).debug('Failed to generate response')
      throw new Error('Failed to generate response', { cause: error })
    }
  }

  async *streamResponse(
    messages: Message[],
    params: ModelParameters,
  ): AsyncGenerator<ModelResponse> {
    try {
      const openai = this.getClient()
      logger.withFields({ model: this.currentThread?.metadata.model }).debug('Starting stream')
      const { textStream } = await streamText({
        ...openai.chat(this.currentThread?.metadata.model ?? 'gpt-3.5-turbo'),
        messages: messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content.value,
        })),
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
      logger.withFields({}).debug('Stream completed')
    }
    catch (error) {
      logger.withFields({ error }).debug('Stream failed')
      throw new Error('Failed to stream response', { cause: error })
    }
  }

  async tokenize(text: string): Promise<number> {
    const tokens = Math.ceil(text.length / 4)
    logger.withFields({ textLength: text.length, tokens }).debug('Tokenized text')
    return tokens
  }
}
