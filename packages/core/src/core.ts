import { Readable } from "stream"
import { zodToJsonSchema } from "zod-to-json-schema"
import {
  ModelRunner,
  OpenaiGpt3dot5TurboModel,
  type BaseModel,
  type BaseModelBaseChat,
} from "./models"

import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai"
import type { StreamEvent } from "@langchain/core/types/stream"
import { AIMessageChunk } from "@langchain/core/messages"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { AgentExecutor, createToolCallingAgent } from "langchain/agents"
import { DynamicStructuredTool } from "langchain/tools"
import { z } from "zod"

const convertSchemaToJSON = (zodSchema: any) => {
  const jsonSchema = [];

  for (const [key, value] of Object.entries(zodSchema.shape) as any) {
    console.log('wae', value)
    const description = value._def.description || ''
    const type = value._def.typeName.toLowerCase()

    jsonSchema.push({
      property: key,
      description,
      type,
    });
  }

  return jsonSchema;
}

export interface nakkaChatMessage {
  role: "user" | "assistant" | "system";
}

export interface nakkaChatMessageText extends nakkaChatMessage {
  type: "text";
  text: string;
}

export interface nakkaChatMessageImageUrl extends nakkaChatMessage {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export interface nakkaChatOptions {
  conversationIds?: string[];
  models: (string | [string, object])[];
  prompt?: string;
  messages?: (nakkaChatMessageText | nakkaChatMessageImageUrl)[];
}

export interface NakkaCoreOptions {
  models: (typeof BaseModel<BaseModelBaseChat>)[];
  env: Record<string, string>;
}

export class NakkaCore {
  private models: BaseModel<BaseModelBaseChat>[] = [];

  constructor(private opts: NakkaCoreOptions) {
    this.models = this.opts.models.map((Model) => new Model());
  }

  env(key: string, defaultValue?: string): string | undefined {
    return this.opts.env[key] || defaultValue;
  }

  envs(): Record<string, string> {
    return this.opts.env;
  }

  getRegisteredModels(): BaseModel<BaseModelBaseChat>["metadata"][] {
    return this.models.map((model) => model.metadata);
  }

  getModelParametersSchema(modelId: string) {
    const model = this.model(modelId)
    if (!model) return undefined
    const jsonSchema = zodToJsonSchema(model.parameters)
    return jsonSchema
  }

  model<T extends BaseModelBaseChat>(
    modelId: string
  ): BaseModel<T> | undefined {
    const model = this.models.find((model) => model.metadata.id === modelId);
    if (model) return model as BaseModel<T>;
  }

  chat(options: nakkaChatOptions) {
    const modelsIds = options.models || [];
    const models = (
      modelsIds
        .map((modelId) => this.model(typeof modelId === "string" ? modelId : modelId[0]))
        .filter((model) => model) as BaseModel<BaseModelBaseChat>[]
    ).map((model) => new ModelRunner(this, model));
    const conversationIds = options.conversationIds || [];
    return new ChatConversation(this, conversationIds, models, options);
  }
}

export interface ChatConversationBaseStream {
  modelIndex: number;
  modelId: string;
  lcEvent: StreamEvent;
  lcEventName: string;
  lcEventFrom: string;
}

export interface ChatConversationStreamContent extends ChatConversationBaseStream {
  type: "content";
  content: string;
  chunk: AIMessageChunk;
}

export interface ChatConversationStreamUsageMetadata extends ChatConversationBaseStream {
  type: "usage_metadata"
  inputTokens: number
  outputTokens: number
}

export interface ChatConversationStreamToolStart extends ChatConversationBaseStream {
  type: "tool_start"
  name: string
  data: any
}

export interface ChatConversationStreamToolEnd extends ChatConversationBaseStream {
  type: "tool_end"
  name: string
  data: any
}

export type ChatConversationStreamEvent = ChatConversationStreamContent | ChatConversationStreamUsageMetadata | ChatConversationStreamToolStart | ChatConversationStreamToolEnd

class AsyncQueue<T> {
  private queue: (T | null)[] = [];
  private resolvers: ((value: T | null) => void)[] = [];

  push(value: T | null) {
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver(value);
    } else {
      this.queue.push(value);
    }
  }

  async next(): Promise<T | null> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }
    return new Promise<T | null>((resolve) => this.resolvers.push(resolve));
  }
}

export class ChatConversation {
  abortController!: AbortController;
  streamEvents: StreamEvent[] = []

  constructor(
    public nakka: NakkaCore,
    public ids: string[],
    public models: ModelRunner<BaseModelBaseChat>[],
    public options: nakkaChatOptions
  ) {}

  // async function* streamToAsyncIterable(stream: ReadableStream<string>): AsyncIterable<string> {
  async *stream(): AsyncIterable<ChatConversationStreamEvent> {
    this.abortController = new AbortController();
    const queue = new AsyncQueue<ChatConversationStreamEvent>();

    // Jalankan semua model secara paralel
    const streamPromises = this.models.map(async (model, modelIndex) => {
      const modelId = model.model.metadata.id;
      const modelParams = Array.isArray(this.options.models[modelIndex]) ? this.options.models[modelIndex][1] : {};
      const lcModel = model.getLangchainModel(modelParams)
      
      // build
      const tools = [
        new DynamicStructuredTool({
          name: 'getWeather',
          description: 'Get weather information',
          schema: z.object({
            location: z.string(),
          }),
          func: async (input) => {
            return `The weather in ${input.location} is sunny`
          }
        })
      ]
      const prompt = ChatPromptTemplate.fromMessages([
        // new MessagesPlaceholder("history"),
        // ["system", SYSTEM_PROMPT],
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
      ])
      const agent = createToolCallingAgent({
        llm: lcModel,
        tools,
        prompt,
      })
      const executor = new AgentExecutor({
        agent,
        tools,
        maxIterations: 3,
        returnIntermediateSteps: true,
      })
      const lcStream = executor.streamEvents({
        input: this.options.prompt || "",
      }, {
        version: "v2",
        signal: this.abortController.signal,
      })


      // start stream
      const reader = lcStream.getReader();
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const val = this._buildStreamFromLangchainStreamEvent(
              modelIndex,
              modelId,
              value
            )
            if (val) {
              this.streamEvents.push(value)
              queue.push(val)
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    });

    // Tunggu hingga semua model selesai
    Promise.allSettled(streamPromises).then(() => queue.push(null));

    // Gunakan generator untuk mengeluarkan hasil dari queue
    while (true) {
      const result = await queue.next();
      if (result === null) break; // Selesai, keluar dari loop
      yield result;
    }
  }

  private _buildStreamFromLangchainStreamEvent(
    modelIndex: number,
    modelId: string,
    ev: StreamEvent
  ): ChatConversationStreamEvent | undefined {
    const baseEv: ChatConversationBaseStream = {
      lcEvent: ev,
      lcEventName: ev.event,
      lcEventFrom: ev.name,
      modelIndex,
      modelId,
    };

    if (ev.data.chunk && ev.data.chunk instanceof AIMessageChunk) {
      let content = "";
      if (typeof ev.data.chunk.content == "string")
        content = ev.data.chunk.content || "";
      return {
        ...baseEv,
        type: "content",
        chunk: ev.data.chunk,
        content,
      };
    } else if (ev.event === 'on_chat_model_end' && ev.data?.output?.usage_metadata?.input_tokens) {
      const input_tokens = ev.data?.output?.usage_metadata?.input_tokens || 0
      const output_tokens = ev.data?.output?.usage_metadata?.output_tokens || 0
      return {
        ...baseEv,
        type: "usage_metadata",
        inputTokens: input_tokens,
        outputTokens: output_tokens,
      }
    } else if (ev.event === 'on_tool_start') {
      return {
        ...baseEv,
        type: "tool_start",
        name: ev.name,
        data: ev.data,
      }
    } else if (ev.event === 'on_tool_end') {
      return {
        ...baseEv,
        type: "tool_end",
        name: ev.name,
        data: ev.data,
      }
    }
  }

  abort(reason: string = "cancelled by user") {
    try {
      console.log("aborting", reason);
      this.abortController.abort(reason);
      return false;
    } catch (e) {
      return true;
    }
  }
}
