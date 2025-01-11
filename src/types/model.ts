export interface ModelOption {
  id: string
  name: string
  description: string
  maxTokens: number
  defaultParams: {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Most capable model, best for complex tasks',
    maxTokens: 8192,
    defaultParams: {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient for most tasks',
    maxTokens: 4096,
    defaultParams: {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Latest model with current knowledge',
    maxTokens: 128000,
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  },
]
