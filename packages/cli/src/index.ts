import { z } from "zod"
import * as uuid from "uuid"
import chalk from 'chalk'
import readline from "readline"
import {
  NakkaCore,
  OpenaiGpt3dot5TurboModel,
  OpenaiGpt4Model,
  OpenaiGpt4oModel,
  type ChatConversationStreamToolEnd,
  type ChatConversationStreamToolStart,
} from "@nakka/core"
import { defineNakkaExtension } from '@nakka/kit'

const EXTENSION_TO_REGISTERS = [
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

class AIStreamCLI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async displayStream(text: string) {
    this.rl.pause();

    const nakka = new NakkaCore({
      extensions: EXTENSION_TO_REGISTERS,
      models: [
        OpenaiGpt4Model,
        OpenaiGpt3dot5TurboModel,
        OpenaiGpt4oModel,
      ],
      env: {
        MODEL_OPENAI_API_KEY: process.env.MODEL_OPENAI_API_KEY || '',
      },
    })
    
    const contents: Record<string, string> = {}
    let tools: {
      key: string,
      start: ChatConversationStreamToolStart,
      end?: ChatConversationStreamToolEnd,
    }[] = []
    const conversation = nakka.chat({
      models: nakka.getRegisteredModels().map((model) => [model.id, {}, { extensions: EXTENSION_TO_REGISTERS.map((e) => e.options.id) }]),
      prompt: text,
    })
    const stream = conversation.stream()
    for await (const chunk of stream) {
      let updateTerminal = true
      const key = `${chunk.modelIndex}.${chunk.modelId}`
      if (chunk.type == 'content') {
        if (contents[key]) contents[key] += chunk.content
        else contents[key] = chunk.content
      } else if (chunk.type == 'tool_start') {
        tools.push({ key, start: chunk })
      } else if (chunk.type == 'tool_end') {
        const tool = tools.find((t) => t.key == key && t.start.name == chunk.name)
        if (tool) tool.end = chunk
      }

      if (updateTerminal) {
        console.clear()
        console.log("[NAKKA STREAMING MULTI MODELS]\n")
        const sortedKeys = Object.keys(contents).sort((a, b) => {
          const aModelId = a
          const bModelId = b
          return aModelId.localeCompare(bModelId)
        })
        const colors = [chalk.green, chalk.yellow, chalk.magenta, chalk.cyan, chalk.red]
        sortedKeys.forEach((key, index) => {
          const color = colors[index % colors.length]
          let header = ``
          const _tools = tools.filter((t) => t.key == key)
          if (_tools.length > 0) {
            header = chalk.blue(`[tools: ${_tools.map(e => `[${e.end ? 'v' : '*'}] ${e.start.name}`).join(' ')}]`)
          }
          console.log(color(`[${key}] ${header}\n${contents[key]}\n`))
        })
      }
    }
  
    console.log("")
    this.rl.resume();
    this.promptInput();
  }

  public async promptInput() {
    this.rl.question("prompt > ", (answer) => {
      console.log(`You asked: ${answer}`)
      this.displayStream(answer)
    })
  }
}

const cli = new AIStreamCLI()
cli.promptInput()
