import {MCPManager} from './dist/mcp/MCPManager.js';

const manager = new MCPManager(process.cwd());
const statuses = manager.load();

console.log('MCP Servers:', statuses.length);
for (const status of statuses) {
  console.log(`  - ${status.name}: ${status.state}`);
}

console.log('\nĐang kết nối...');
const connected = await manager.refresh();

console.log('\nKết quả:');
for (const status of connected) {
  console.log(`  - ${status.name}: ${status.state}${status.toolCount ? ` (${status.toolCount} tools)` : ''}${status.error ? ` - ${status.error}` : ''}`);
}

await manager.close();
