import {createServer, type Server} from 'node:http';
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import open from 'open';
import type {OAuthClientProvider} from '@modelcontextprotocol/sdk/client/auth.js';

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
}

export interface OAuthClientInformation {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}

const TOKEN_DIR = join(homedir(), '.pxhvibe');
const TOKEN_FILE = join(TOKEN_DIR, 'oauth-tokens.json');
const CLIENT_INFO_FILE = join(TOKEN_DIR, 'oauth-client.json');

export class PXHVOAuthProvider implements OAuthClientProvider {
  private _tokens: OAuthTokens | undefined;
  private _clientInformation: OAuthClientInformation | undefined;
  private _codeVerifier: string | undefined;
  private _redirectUrl: string;
  private _clientMetadata: {
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
    scope?: string;
  };
  private callbackServer: Server | undefined;
  private callbackPort: number;

  constructor(serverName: string, scope?: string) {
    this.callbackPort = 8090 + Math.floor(Math.random() * 100); // Random port to avoid conflicts
    this._redirectUrl = `http://localhost:${this.callbackPort}/callback`;
    this._clientMetadata = {
      client_name: 'PXHVibe MCP Client',
      redirect_uris: [this._redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client
      scope: scope || 'openid offline_access',
    };
    
    // Load persisted tokens and client info
    this.loadTokens();
    this.loadClientInformation();
  }

  get redirectUrl(): string {
    return this._redirectUrl;
  }

  get clientMetadata() {
    return this._clientMetadata;
  }

  clientInformation(): OAuthClientInformation | undefined {
    return this._clientInformation;
  }

  saveClientInformation(clientInformation: OAuthClientInformation): void {
    this._clientInformation = clientInformation;
    this.persistClientInformation();
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    this.persistTokens();
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    console.log('\n🌐 Opening browser for MCP OAuth authentication...');
    console.log(`   If browser doesn't open, visit: ${authorizationUrl.toString()}\n`);
    open(authorizationUrl.toString()).catch(() => {
      console.log('⚠️  Failed to open browser automatically');
    });
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
  }

  codeVerifier(): string {
    if (!this._codeVerifier) {
      throw new Error('No code verifier saved');
    }
    return this._codeVerifier;
  }

  async waitForCallback(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.callbackServer = createServer((req, res) => {
        if (req.url === '/favicon.ico') {
          res.writeHead(404);
          res.end();
          return;
        }

        const url = new URL(req.url || '', `http://localhost:${this.callbackPort}`);
        
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (code) {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <link rel="preconnect" href="https://fonts.googleapis.com">
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
                </head>
                <body style="font-family: 'Montserrat', system-ui, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0;">
                  <div style="background: white; border-radius: 20px; padding: 60px; max-width: 500px; margin: 50px auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h1 style="color: #10b981; font-size: 48px; margin: 0 0 20px 0;">✅</h1>
                    <h2 style="color: #1f2937; font-size: 32px; margin: 0 0 15px 0; font-weight: 700;">Authorization Successful!</h2>
                    <p style="color: #6b7280; font-size: 18px; margin: 0 0 30px 0; line-height: 1.6;">You can close this window and return to PXHVibe.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; margin-top: 20px;">
                      <p style="color: #9ca3af; font-size: 14px; margin: 0;">Window will close automatically in 2 seconds...</p>
                    </div>
                  </div>
                  <script>setTimeout(() => window.close(), 2000);</script>
                </body>
              </html>
            `);
            resolve(code);
            setTimeout(() => this.callbackServer?.close(), 3000);
          } else if (error) {
            res.writeHead(400, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <link rel="preconnect" href="https://fonts.googleapis.com">
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
                </head>
                <body style="font-family: 'Montserrat', system-ui, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); min-height: 100vh; margin: 0;">
                  <div style="background: white; border-radius: 20px; padding: 60px; max-width: 500px; margin: 50px auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h1 style="color: #ef4444; font-size: 48px; margin: 0 0 20px 0;">❌</h1>
                    <h2 style="color: #1f2937; font-size: 32px; margin: 0 0 15px 0; font-weight: 700;">Authorization Failed</h2>
                    <p style="color: #6b7280; font-size: 18px; margin: 0; line-height: 1.6;">Error: ${error}</p>
                  </div>
                </body>
              </html>
            `);
            reject(new Error(`OAuth authorization failed: ${error}`));
          } else {
            res.writeHead(400);
            res.end('Bad request');
            reject(new Error('No authorization code provided'));
          }
        }
      });

      this.callbackServer.listen(this.callbackPort, () => {
        // Server started
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        this.callbackServer?.close();
        reject(new Error('OAuth callback timeout'));
      }, 120000);
    });
  }

  closeCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = undefined;
    }
  }

  private loadTokens(): void {
    try {
      if (existsSync(TOKEN_FILE)) {
        const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
        // Check if tokens are expired
        if (data.expires_at && Date.now() >= data.expires_at) {
          // Tokens expired, but keep refresh_token if available
          if (data.refresh_token) {
            this._tokens = {
              access_token: '',
              refresh_token: data.refresh_token,
              token_type: data.token_type || 'Bearer',
            };
          }
        } else {
          this._tokens = data;
        }
      }
    } catch {
      this._tokens = undefined;
    }
  }

  private persistTokens(): void {
    if (!existsSync(TOKEN_DIR)) {
      mkdirSync(TOKEN_DIR, {recursive: true});
    }
    writeFileSync(TOKEN_FILE, JSON.stringify(this._tokens, null, 2));
  }

  private loadClientInformation(): void {
    try {
      if (existsSync(CLIENT_INFO_FILE)) {
        this._clientInformation = JSON.parse(readFileSync(CLIENT_INFO_FILE, 'utf-8'));
      }
    } catch {
      this._clientInformation = undefined;
    }
  }

  private persistClientInformation(): void {
    if (!existsSync(TOKEN_DIR)) {
      mkdirSync(TOKEN_DIR, {recursive: true});
    }
    writeFileSync(CLIENT_INFO_FILE, JSON.stringify(this._clientInformation, null, 2));
  }

  clearTokens(): void {
    this._tokens = undefined;
    if (existsSync(TOKEN_FILE)) {
      const fs = require('fs');
      fs.unlinkSync(TOKEN_FILE);
    }
  }
}
