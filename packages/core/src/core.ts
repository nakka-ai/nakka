import { Readable } from "stream"
import { zodToJsonSchema } from "zod-to-json-schema"
import { z } from "zod"

import { NakkaExtensionKit, type NakkaExtensionContext, type NakkaExtensionReturn } from "@nakka/kit"

import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai"
import type { StreamEvent } from "@langchain/core/types/stream"
import { AIMessageChunk } from "@langchain/core/messages"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { AgentExecutor, createToolCallingAgent } from "langchain/agents"
import { DynamicStructuredTool } from "langchain/tools"

import {
  ModelRunner,
  type BaseModel,
  type BaseModelBaseChat,
} from "./models"

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
  models: (
    string | [
      string, object, {
        extensions: (string | [string, object])[]
      }
    ]
  )[]
  prompt?: string;
  messages?: (nakkaChatMessageText | nakkaChatMessageImageUrl)[];
}

export interface NakkaCoreOptions {
  models: (typeof BaseModel<BaseModelBaseChat>)[]
  extensions: NakkaExtensionReturn[]
  env: Record<string, string>
}

export class NakkaCore {
  public kit: NakkaExtensionKit
  public models: BaseModel<BaseModelBaseChat>[] = [];

  constructor(public opts: NakkaCoreOptions) {
    this.models = this.opts.models.map((Model) => new Model())
    this.kit = new NakkaExtensionKit(this)
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
    const conversationIds = options.conversationIds || []
    const modelsIds = options.models || [];
    const models = (
      modelsIds
        .map((modelId) => {
          const isModelIdString = typeof modelId === "string"
          return {
            model: this.model(isModelIdString ? modelId : modelId[0]),
            params: isModelIdString ? {} : modelId[1],
            extensions: isModelIdString ? [] : modelId[2].extensions.map((extId) => ({
              id: typeof extId === "string" ? extId : extId[0],
              params: typeof extId === "string" ? {} : extId[1],
              context: this.kit.getExtension(typeof extId === "string" ? extId : extId[0]),
            })),
          }
        })
        // .map((model) => {
        //   return {
        //     ...model,
        //     // extension: model.extensionIds.map((extId) => this.kit.getExtension(extId)),
        //   }
        // })
        .filter((model) => {
          // {
          //   model: model.model,
          //   params: model.params,
          //   extensions: model.extension,
          // }
          if (!model.model || !model.extensions || !model.params) return false
          return true
        }) as {
          model: BaseModel<BaseModelBaseChat>,
          params: z.infer<BaseModel<BaseModelBaseChat>["parameters"]>,
          extensions: {
            id: string,
            params: object,
            context: NakkaExtensionContext,
          }[]
        }[]
    ).map((model) => new ModelRunner(this, model.model, model.extensions))

    return new ChatConversation(
      this,
      conversationIds,
      models,
      options
    )
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
  input: {
    [key: string]: any
  }
}

export interface ChatConversationStreamToolEnd extends ChatConversationBaseStream {
  type: "tool_end"
  name: string
  input: {
    [key: string]: any
  }
  output: object
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
      const tools = model.getTools()
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
      const reader = lcStream.getReader()
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
      let input = {}
      try {
        input = JSON.parse(ev.data?.input?.input || '')
      } catch (error) {}
      return {
        ...baseEv,
        type: "tool_start",
        name: ev.name,
        input,
      }
    } else if (ev.event === 'on_tool_end') {
      let input = {}
      try {
        input = JSON.parse(ev.data?.input?.input || '')
      } catch (error) {}
      return {
        ...baseEv,
        type: "tool_end",
        name: ev.name,
        input,
        output: ev.data?.output || '',
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
