import { describe, it, expect, beforeEach } from 'bun:test'
import readline from 'readline'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import * as uuid from 'uuid'

import {
  NakkaCore,
  OpenaiGpt3dot5TurboModel,
  OpenaiGpt4Model,
  OpenaiGpt4oModel,
  type ChatConversationStreamEvent
} from '@nakka/core'
import { defineNakkaExtension } from '@nakka/kit'

describe('basic', () => {
  // setup
  let nakka: NakkaCore
  const modelsToRegister = [
    OpenaiGpt3dot5TurboModel,
    OpenaiGpt4Model,
    OpenaiGpt4oModel,
  ]
  const extensionsToRegister = [
    defineNakkaExtension({
      id: '@official/uuid-generator',
      name: 'UUID Generator Tool',
      description: 'Generate UUID realtime',
      tags: ['tools', 'generator'],
      schema: z.object({
        version: z.enum(['auto', 'v4', 'v6', 'v7']).default('auto'),
      }),
      setup(context) {
        context.addTool(
          'uuid-generator',
          `use this tool if user want to generate uuid`,
          z.object({
            version: z.enum(['v4', 'v6', 'v7']).default('v4'),
          }),
          async (params, input) => {
            const version = params.version == 'auto' ? input.version : params.version
            if (version === 'v6') return uuid.v6()
            if (version === 'v7') return uuid.v7()
            return uuid.v4()
          }
        )
      },
    }),
    defineNakkaExtension({
      id: '@official/weather',
      name: 'Realtiem Weather',
      description: 'Get realtime weather',
      tags: ['tools'],
      schema: z.object({}),
      setup(context) {
        context.addTool(
          'weather',
          `use this tool if user want to get realtime weather`,
          z.object({
            location: z.string().default('jakarta'),
          }),
          async (params, input) => {
            return `Weather in ${input.location} is sunny`
          }
        )
      },
    }),
  ]

  // setup
  beforeEach(() => {
    nakka = new NakkaCore({
      models: modelsToRegister,
      extensions: extensionsToRegister,
      env: {
        MODEL_OPENAI_API_KEY: process.env.MODEL_OPENAI_API_KEY || '',
      }
    })
  })

  // its
  it('streaming chat', async () => {
    const conversation = nakka.chat({
      models: [
        [
          '@openai/gpt4o',
          { temperature: 1, maxTokens: '100' },
          {
            extensions: [
              ['@official/uuid-generator', { version: 'v6' }],
              '@official/weather',
            ],
          }
        ],
        // ['@openai/gpt4', { temperature: 1, maxTokens: 40 }],
        // ['@openai/gpt3.5-turbo', { temperature: 1, maxTokens: 40 }],
      ],
      prompt: 'generate uuid, then get weather in jakarta today',
    })
    
    const modelOutputs: Record<string, string> = {};
    conversation.models.forEach((model, index) => {
      const key = `${index}.${model.model.metadata.id}`
      modelOutputs[key] = ""
    })
    const updateCLI = () => {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
      console.log("Nakka Streaming multi models...\n")
      Object.entries(modelOutputs).forEach(([key, output]) => console.log(`[${key}] ${output}`))
    }

    // stream output
    console.log(`stream:`);
    const stream = conversation.stream()
    const chunks: ChatConversationStreamEvent[] = []
    const data: string[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
      const key = `${chunk.modelIndex}.${chunk.modelId}`
      let content = ''
      if (chunk.type === 'error') {
        console.error(chunk)
      } else if (chunk.type === 'content' && chunk.content) {
        content = chunk.content
      } else if (chunk.type === 'tool_start') {
        content = `(tool.start:${chunk.name})`
        // data.push(`[${key}] [tool] start: ${chunk.name} data: ${JSON.stringify(chunk.input)}`)
      } else if (chunk.type === 'tool_end') {
        content = `(tool.end:${chunk.name})`
        // data.push(`[${key}] [tool] end: ${chunk.name} data: ${chunk.output}`)
      } else if (chunk.type === 'usage_metadata') {
        content = `(usage.input:${chunk.inputTokens})(usage.output:${chunk.outputTokens})`
      }
      modelOutputs[key] = (modelOutputs[key] || '') + content
      if (content != '') updateCLI()
    }
    // for debug:
    // const chunksJson = JSON.stringify(chunks, null, 2)
    // fs.writeFileSync(path.join(__dirname, 'streaming.json'), chunksJson)
  })

  it('should work', () => {
    // const nakka = new NakkaCore({
    //   models: [
    //     OpenaiGpt3dot5TurboModel,
    //   ],
    //   env: {
    //     MODEL_OPENAI_API_KEY: process.env.MODEL_OPENAI_API_KEY || '',
    //   }
    // })
    // console.log(models)
    // const result = nakka.chat(models[0].id, {
    //   content: 'Hello, how are you?'
    // })
    // console.log(result)
    // for await (const chunk of streamToAsyncIterable(createSimulateStream('Hello, how are you?'))) {
    //   console.log(chunk)
    // }
    // const stream = await (nakka.model<BaseModelBaseChat>(models[0].id))?.getLangchainModel().stream('test')
    // if (!stream) throw new Error('Stream not found')
    // for await (const chunk of stream) {
    //   console.log(chunk.content)
    // }
  })

  it('models should be registered', () => {
    const models = nakka.getRegisteredModels()
    expect(models).toHaveLength(modelsToRegister.length)
    // console.log(JSON.stringify(nakka.getModelParametersSchema(models[0].id), null, 2))
  })
})