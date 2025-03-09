import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import type { ToolCall } from '@langchain/core/messages/tool'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { BaseDynamicToolInput } from '@langchain/core/tools'
import { NakkaCore } from '@nakka/core'
import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'

type ZodObjectAny = z.ZodObject<any, any, any, any>

export class NakkaExtensionKit {
  exts: NakkaExtensionContext<any>[] = []

  constructor(public nakka: NakkaCore) {
    // install
    for (const tool of nakka.opts.extensions) {
      tool.install(this as any)
    }
  }

  context<K extends ZodObjectAny = ZodObjectAny>(extension: NakkaExtension<K>) {
    const context: NakkaExtensionContext<K> = {
      extension,
      tools: [],
      addTool: <T extends ZodObjectAny = ZodObjectAny>(
        name: string,
        description: string,
        schema: T extends ZodObjectAny ? T : ZodObjectAny,
        func: (
          params: z.infer<K>,
          input: z.infer<T>,
          runManager?: CallbackManagerForToolRun,
          config?: RunnableConfig,
        ) => Promise<string>
      ) => {
        context.tools.push((params: object) => {
          return new DynamicStructuredTool({
            name,
            description,
            schema,
            func(input, runManager, config) {
              return func(params, input, runManager, config)
            },
          })
        })
      }
    }
    return context
  }

  getExtension(id: string): NakkaExtensionContext | undefined {
    return this.exts.find((ext) => ext.extension.id === id)
  }
}

export interface NakkaExtension<K extends ZodObjectAny = ZodObjectAny> {
  id: string
  name: string
  description: string
  tags: string[]
  schema: K
  // setup: (context: ReturnType<NakkaExtensionKit['context']>) => void
  // need to pass generic K to method <K>context()
  setup: (context: NakkaExtensionContext<K>) => void
}

export interface NakkaExtensionContext<K extends ZodObjectAny = ZodObjectAny> {
  extension: NakkaExtension<K>
  tools: ((params: z.infer<K>) => DynamicStructuredTool)[]

  // 
  addTool: <T extends ZodObjectAny = ZodObjectAny>(
    name: string,
    description: string,
    schema: T extends ZodObjectAny ? T : ZodObjectAny,
    func: (params: z.infer<K>, input: z.infer<T>) => Promise<string>
  ) => void
}

export interface NakkaExtensionReturn<K extends ZodObjectAny = ZodObjectAny> {
  options: NakkaExtension<K>
  install: (kit: NakkaExtensionKit) => NakkaExtensionContext<K>
}

export const defineNakkaExtension = <K extends ZodObjectAny = ZodObjectAny>(options: NakkaExtension<K>): NakkaExtensionReturn<K> => {
  return {
    options,
    install: (kit: NakkaExtensionKit) => {
      const context = kit.context<typeof options['schema']>(options)
      
      // setup
      options.setup(context)

      // register
      kit.exts.push(context)

      return context
      // return {
      //   options,
      //   context: context as any,
      // }
    }
  }
}