export class NakkaChatConversationError extends Error {
  wrapperError: Error
  lcError?: string

  constructor(err: any) {
    const error = err instanceof Error ? err : new Error(`${err}`)
    const lcError = (typeof (error as any)?.lc_error_code == 'string') ? (error as any).lc_error_code : undefined
    let desc = ''
    if (lcError) desc = `[${lcError}]`
    const message = `[${error.constructor.name}] ${desc} ${error.message}`
    super(message || error.message)
    this.name = "NakkaChatConversationError"
    this.wrapperError = error
    this.lcError = lcError
  }
}

export class ModelError extends NakkaChatConversationError {
  constructor(err: any) {
    super(err)
  }
}