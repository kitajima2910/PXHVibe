import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {UnauthorizedError} from '@modelcontextprotocol/sdk/client/auth.js';
import type {AgentTool} from '../agent/types.js';
import {PXHVOAuthProvider} from './OAuthProvider.js';

export type MCPServerState = 'disabled' | 'configured' | 'connecting' | 'connected' | 'error';

interface MCPServerBase {
  disabled?: boolean;
  timeout?: number;
}

export interface LocalMCPServerConfig extends MCPServerBase {
  type: 'local';
  command: string[];
  environment?: Record<string, string>;
  cwd?: string;
}

export interface RemoteMCPServerConfig extends MCPServerBase {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
  auth?: 'oauth';
}

export type MCPServerConfig = LocalMCPServerConfig | RemoteMCPServerConfig;

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

export interface MCPServerStatus {
  name: string;
  state: MCPServerState;
  toolCount?: number;
  error?: string;
}

interface MCPConnection {
  client: Client;
  close(): Promise<void>;
}

export const mcpConfigRelativePath = path.join('.pxhvibe', 'mcp.json');

export class MCPManager {
  private connections: MCPConnection[] = [];
  private currentTools: AgentTool[] = [];
  private currentStatuses: MCPServerStatus[] = [];

  constructor(private readonly cwd: string) {}

  get tools(): readonly AgentTool[] {
    return this.currentTools;
  }

  get statuses(): readonly MCPServerStatus[] {
    return this.currentStatuses;
  }

  load(): readonly MCPServerStatus[] {
    const config = loadMCPConfig(this.cwd);
    this.currentStatuses = Object.entries(config.servers).map(([name, server]) => ({
      name,
      state: server.disabled ? 'disabled' : 'configured',
    }));
    return this.statuses;
  }

  async refresh(): Promise<readonly MCPServerStatus[]> {
    await this.close();
    const config = loadMCPConfig(this.cwd);
    const statuses: MCPServerStatus[] = [];
    const tools: AgentTool[] = [];
    const usedToolNames = new Set<string>();

    for (const [serverName, server] of Object.entries(config.servers)) {
      if (server.disabled) {
        statuses.push({name: serverName, state: 'disabled'});
        continue;
      }

      statuses.push({name: serverName, state: 'connecting'});
      let connection: MCPConnection | undefined;
      try {
        connection = await connectServer(serverName, server, this.cwd);
        const response = await connection.client.listTools({}, {timeout: server.timeout ?? 30_000});
        this.connections.push(connection);
        for (const tool of response.tools) {
          const exposedName = uniqueToolName(serverName, tool.name, usedToolNames);
          usedToolNames.add(exposedName);
          tools.push(createMCPTool(
            connection.client,
            serverName,
            tool.name,
            exposedName,
            tool.description,
            tool.inputSchema,
            server.timeout ?? 60_000,
          ));
        }
        statuses[statuses.length - 1] = {
          name: serverName,
          state: 'connected',
          toolCount: response.tools.length,
        };
      } catch (error: unknown) {
        if (connection !== undefined && !this.connections.includes(connection)) {
          await connection.close().catch(() => undefined);
        }
        statuses[statuses.length - 1] = {
          name: serverName,
          state: 'error',
          error: compactError(error),
        };
      }
    }

    this.currentTools = tools;
    this.currentStatuses = statuses;
    return this.statuses;
  }

  async close(): Promise<void> {
    const connections = this.connections;
    this.connections = [];
    this.currentTools = [];
    await Promise.allSettled(connections.map((connection) => connection.close()));
  }
}

export function loadMCPConfig(cwd: string): MCPConfig {
  const configPath = path.join(cwd, mcpConfigRelativePath);
  if (!existsSync(configPath)) return {servers: {}};

  let value: unknown;
  try {
    value = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
  } catch (error: unknown) {
    throw new Error(`MCP config không hợp lệ (${configPath}): ${compactError(error)}`);
  }
  if (!isRecord(value) || !isRecord(value.servers)) {
    throw new Error(`MCP config phải có object "servers" (${configPath}).`);
  }

  const servers: Record<string, MCPServerConfig> = {};
  for (const [name, server] of Object.entries(value.servers)) {
    servers[name] = parseServerConfig(name, server, configPath);
  }
  return {servers};
}

export function toOpenCodeMCPConfig(config: MCPConfig): Record<string, unknown> {
  return Object.fromEntries(Object.entries(config.servers).map(([name, server]) => [
    name,
    server.type === 'local'
      ? {
        type: 'local', command: server.command, enabled: !server.disabled,
        ...(server.environment === undefined ? {} : {environment: server.environment}),
        ...(server.timeout === undefined ? {} : {timeout: server.timeout}),
      }
      : {
        type: 'remote', url: server.url, enabled: !server.disabled,
        ...(server.headers === undefined ? {} : {headers: server.headers}),
        ...(server.timeout === undefined ? {} : {timeout: server.timeout}),
      },
  ]));
}

export function formatMCPStatus(statuses: readonly MCPServerStatus[]): string {
  if (statuses.length === 0) {
    return `MCP · Chưa cấu hình\nTạo ${mcpConfigRelativePath} để kết nối server.`;
  }
  return [
    `MCP · ${statuses.filter((status) => status.state === 'connected').length}/${statuses.length} connected`,
    ...statuses.map((status) => {
      const suffix = status.toolCount === undefined ? '' : ` · ${status.toolCount} tools`;
      const error = status.error === undefined ? '' : ` · ${status.error}`;
      return `${mcpStatusSymbol(status.state)} ${status.name} · ${status.state}${suffix}${error}`;
    }),
  ].join('\n');
}

export function mcpStatusSymbol(state: MCPServerState): string {
  if (state === 'connected') return '●';
  if (state === 'error') return '✖';
  if (state === 'connecting') return '◐';
  return '○';
}

async function connectServer(name: string, config: MCPServerConfig, workspace: string): Promise<MCPConnection> {
  const client = new Client({name: `pxhvibe-${name}`, version: '1.0.0'});
  
  // For remote servers, check if we need OAuth
  if (config.type === 'remote') {
    const headers = resolveValues(config.headers ?? {});
    
    // If no Authorization header, try OAuth
    if (!headers['Authorization'] && !headers['authorization']) {
      return connectWithOAuth(client, name, config);
    }
    
    // Use provided headers
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: {headers},
    });
    await client.connect(transport as Transport);
    return {client, close: () => client.close()};
  }
  
  // Local server
  const transport = new StdioClientTransport({
    command: config.command[0]!,
    args: config.command.slice(1),
    cwd: config.cwd === undefined ? workspace : path.resolve(workspace, config.cwd),
    env: {...stringEnvironment(process.env), ...resolveValues(config.environment ?? {})},
    stderr: 'pipe',
  });
  await client.connect(transport as Transport);
  return {client, close: () => client.close()};
}

async function connectWithOAuth(
  client: Client,
  name: string,
  config: RemoteMCPServerConfig,
): Promise<MCPConnection> {
  const oauthProvider = new PXHVOAuthProvider(name);
  
  // Try to connect with existing tokens first
  let transport = new StreamableHTTPClientTransport(new URL(config.url), {
    authProvider: oauthProvider,
  });
  
  try {
    await client.connect(transport as Transport);
    return {client, close: () => client.close()};
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // Need to perform OAuth
      console.log(`🔐 OAuth required for ${name}`);
      
      // Wait for OAuth callback
      const authCode = await oauthProvider.waitForCallback();
      
      // Complete OAuth flow
      await transport.finishAuth(authCode);
      
      // Reconnect with authenticated transport
      transport = new StreamableHTTPClientTransport(new URL(config.url), {
        authProvider: oauthProvider,
      });
      await client.connect(transport as Transport);
      
      oauthProvider.closeCallbackServer();
      return {client, close: () => client.close()};
    }
    throw error;
  }
}

function createMCPTool(
  client: Client,
  serverName: string,
  originalName: string,
  exposedName: string,
  description: string | undefined,
  inputSchema: unknown,
  timeout: number,
): AgentTool {
  return {
    name: exposedName,
    description: `[MCP ${serverName}] ${description ?? originalName}`,
    parameters: isRecord(inputSchema) ? inputSchema : {type: 'object', properties: {}},
    async execute(argumentsValue) {
      const args = isRecord(argumentsValue) ? argumentsValue : {};
      const result = await client.callTool({name: originalName, arguments: args}, undefined, {timeout});
      if (result.isError) throw new Error(formatMCPResult(result));
      return formatMCPResult(result);
    },
  };
}

function formatMCPResult(result: unknown): string {
  if (!isRecord(result)) return String(result);
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => item.type === 'text' && typeof item.text === 'string'
      ? item.text
      : JSON.stringify(item))
    .join('\n');
  if (text.length > 0) return text;
  if ('structuredContent' in result) return JSON.stringify(result.structuredContent, null, 2);
  return JSON.stringify(result, null, 2);
}

function uniqueToolName(server: string, tool: string, used: Set<string>): string {
  const base = `mcp_${sanitizeName(server)}_${sanitizeName(tool)}`.slice(0, 64);
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    const suffix = `_${index}`;
    candidate = `${base.slice(0, 64 - suffix.length)}${suffix}`;
    index += 1;
  }
  return candidate;
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || 'tool';
}

function resolveValues(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.replace(
    /\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_placeholder, variableName: string) => {
      const resolved = process.env[variableName];
      if (resolved === undefined) throw new Error(`Thiếu biến môi trường ${variableName} cho MCP.`);
      return resolved;
    },
  )]));
}

function parseServerConfig(name: string, value: unknown, configPath: string): MCPServerConfig {
  if (!isRecord(value)) throw new Error(`MCP server "${name}" không hợp lệ (${configPath}).`);
  const shared = {
    ...(typeof value.disabled === 'boolean' ? {disabled: value.disabled} : {}),
    ...(typeof value.timeout === 'number' && value.timeout > 0 ? {timeout: value.timeout} : {}),
  };
  if (value.type === 'local' && Array.isArray(value.command)
    && value.command.length > 0 && value.command.every((item) => typeof item === 'string')) {
    return {
      type: 'local', command: value.command as string[], ...shared,
      ...(isStringRecord(value.environment) ? {environment: value.environment} : {}),
      ...(typeof value.cwd === 'string' ? {cwd: value.cwd} : {}),
    };
  }
  if (value.type === 'remote' && typeof value.url === 'string') {
    try { new URL(value.url); } catch { throw new Error(`URL của MCP server "${name}" không hợp lệ.`); }
    return {
      type: 'remote', url: value.url, ...shared,
      ...(isStringRecord(value.headers) ? {headers: value.headers} : {}),
      ...(value.auth === 'oauth' ? {auth: 'oauth'} : {}),
    };
  }
  throw new Error(`MCP server "${name}" cần type local + command[] hoặc type remote + url.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function stringEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim().slice(0, 180);
}
