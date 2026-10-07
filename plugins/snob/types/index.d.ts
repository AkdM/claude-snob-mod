// 0 means off, 1 to 5 is the persona level.
export type SnobLevel = number

declare module 'claude-code' {
  interface PluginState {
    snob: { level: SnobLevel }
  }
}
