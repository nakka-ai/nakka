import { describe, it, expect, beforeEach } from 'bun:test'
import readline from 'readline'
import path from 'path'
import fs from 'fs'
import {
  NakkaCore,
  OpenaiGpt3dot5TurboModel,
  OpenaiGpt4Model,
  OpenaiGpt4oModel,
  type ChatConversationStreamEvent
} from '../src'

describe('basic', () => {
  // setup
  let nakka: NakkaCore
  const modelsToRegister = [
    OpenaiGpt3dot5TurboModel,
    OpenaiGpt4Model,
    OpenaiGpt4oModel,
  ]
  beforeEach(() => {
    nakka = new NakkaCore({
      models: modelsToRegister,
      env: {
        MODEL_OPENAI_API_KEY: process.env.MODEL_OPENAI_API_KEY || '',
      }
    })
  })

  // its
  it('streaming chat', async () => {
    const conversation = nakka.chat({
      // models: ['@openai/gpt3.5-turbo', '@openai/gpt4', '@openai/gpt4'], // multi models 
      models: [
        // '@openai/gpt4o',
        ['@openai/gpt3.5-turbo', { temperature: 0, maxTokens: 40 }],
        // ['@openai/gpt3.5-turbo', { temperature: 1, maxTokens: 40 }],
      ],
      // prompt: 'hai, siapa kamu?',
      prompt: 'apa cuaca di surabaya saiki?',
    })
    
    const modelOutputs: Record<string, string> = {};
    conversation.models.forEach((model, index) => {
      const key = `${index}.${model.model.metadata.id}`
      modelOutputs[key] = ""
    })
    const updateCLI = () => {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
      console.log("nakka Streaming multi models...\n")
      Object.entries(modelOutputs).forEach(([key, output]) => console.log(`[${key}] ${output}`))
    }

    // Stream output
    console.log(`stream:`);
    const stream = conversation.stream()
    const chunks: ChatConversationStreamEvent[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
      const key = `${chunk.modelIndex}.${chunk.modelId}`
      let content = ''
      if (chunk.type === 'content' && chunk.content) {
        content = chunk.content
        updateCLI()
      } else if (chunk.type === 'tool_start') {
        content = `(tool.start:${chunk.name})`
      } else if (chunk.type === 'tool_end') {
        content = `(tool.end:${chunk.name})`
      } else if (chunk.type === 'usage_metadata') {
        // content = `[usage] input: ${chunk.inputTokens} output: ${chunk.outputTokens}`
        content = `(usage.input:${chunk.inputTokens})(usage.output:${chunk.outputTokens})`
      }
      modelOutputs[key] = (modelOutputs[key] || '') + content
    }
    console.log(`\nDone.`)
    const chunksJson = JSON.stringify(chunks, null, 2)
    fs.writeFileSync(path.join(__dirname, 'streaming.json'), chunksJson)
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