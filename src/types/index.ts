import type { IsolatedWorldContentScriptDefinition } from "wxt";

export type ContentScriptContext = Parameters<
  IsolatedWorldContentScriptDefinition["main"]
>[0];
