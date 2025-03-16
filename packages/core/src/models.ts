import { z } from 'zod'
import type { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models'
import type { AIMessageChunk } from '@langchain/core/messages'
import { ChatOpenAI, type ChatOpenAICallOptions } from '@langchain/openai'
import { DynamicStructuredTool } from 'langchain/tools'
import type { NakkaExtensionContext } from '@nakka/kit'
import { ModelError, NakkaChatConversationError, type NakkaCore } from '.'

export interface ModelMetadata {
  id: string
  name: string
  group: string
  description: string
  tags: string[]
  provider: boolean
}

export type BaseModelBaseChat = BaseChatModel<BaseChatModelCallOptions, AIMessageChunk>

// use generic K as zod object
export class BaseModel<T extends BaseModelBaseChat, K extends z.ZodObject<any> = z.ZodObject<any>> {
  metadata!: ModelMetadata
  parameters!: K

  constructor(metadata?: Partial<ModelMetadata>) {
    this.metadata = {
      id: metadata?.id || 'base',
      name: metadata?.name || 'Base Model',
      group: metadata?.group || 'base',
      description: metadata?.description || 'Base model',
      tags: metadata?.tags || [],
      provider: metadata?.provider || true,
    }
  }

  getLangchainModel(nakka: NakkaCore, params: z.infer<K>): T {
    throw new Error('Not implemented')
  }
}

export class ModelRunner<K extends BaseModelBaseChat, T extends BaseModel<K> = BaseModel<K>> {
  constructor(private nakka: NakkaCore, public model: T, public extensions: { params: object, context: NakkaExtensionContext }[] = []) {
  }

  getLangchainModel(params: z.infer<T['parameters']> = {}): K {
    const parsed = this.model.parameters.parse(params)
    return this.model.getLangchainModel(this.nakka, parsed)
  }

  getTools(): DynamicStructuredTool[] {
    // parse first
    const params: Record<string, object> = {}
    for (const e of this.extensions.filter((e) => e.context)) {
      const parsed = e.context.extension.schema.parse(e.params)
      params[e.context.extension.id] = parsed
    }
    // return this.extensions.map((e) => e.context.tools.map((t) => t(e.params))).flat()
    return this.extensions
      .filter(e => e.context)
      .map((e) => e.context.tools.map((t) => t(params[e.context.extension.id])))
      .flat()
  }
}


// OPENAI PROVIDERS
export class OpenaiBaseModel extends BaseModel<ChatOpenAI<ChatOpenAICallOptions>> {
  openaiModelName: string = 'gpt-3.5-turbo'
  parameters = z.object({
    temperature: z.number().min(0).max(2).default(1).describe('temperature of the model'),
    maxTokens: z.number().min(0).default(0).describe('max tokens of the model, -1 for unlimited'),
    presencePenalty: z.number().min(0).max(2).default(0).describe('presence penalty of the model'),
    frequencyPenalty: z.number().min(0).max(2).default(0).describe('frequency penalty of the model'),
    topP: z.number().min(0).max(1).default(1).describe('top p of the model'),
  })
  
  getLangchainModel(nakka: NakkaCore, params: z.infer<this['parameters']>){
    if (!nakka.env('MODEL_OPENAI_API_KEY')) throw new ModelError('OpenAI API key not found')
    const maxTokens = (params.maxTokens == 0) ? -1 : params.maxTokens
    const model = new ChatOpenAI({
      openAIApiKey: nakka.env('MODEL_OPENAI_API_KEY'),
      model: this.openaiModelName,
      streaming: true,
      streamUsage: true,
      // params
      temperature: params.temperature,
      maxTokens: maxTokens,
      presencePenalty: params.presencePenalty,
      frequencyPenalty: params.frequencyPenalty,
      topP: params.topP,
      // configuration: {
      //   baseURL: 'https://google.com',
      // }
    })
    return model
  }
}

export class OpenaiGpt3dot5TurboModel extends OpenaiBaseModel {
  constructor() {
    super({
      id: '@openai/gpt3.5-turbo',
      name: 'GPT-3.5',
      description: 'OpenAI GPT-3.5 model',
      group: 'openai',
      tags: ['openai', 'gpt3.5', 'fast']
    })
    this.openaiModelName = 'gpt-3.5-turbo'
  }
}

export class OpenaiGpt4Model extends OpenaiBaseModel {
  constructor() {
    super({
      id: '@openai/gpt4',
      name: 'GPT-4',
      description: 'OpenAI GPT-4 model',
      group: 'openai',
      tags: ['openai', 'gpt4', 'fast']
    })
    this.openaiModelName = 'gpt-4'
  }
}

export class OpenaiGpt4oModel extends OpenaiBaseModel {
  constructor() {
    super({
      id: '@openai/gpt4o',
      name: 'GPT-4o',
      description: 'OpenAI GPT-4o model',
      group: 'openai',
      tags: ['openai', 'gpt4o', 'fast']
    })
    this.openaiModelName = 'gpt-4o'
  }
}

// 