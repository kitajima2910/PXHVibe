import {createRequire} from 'node:module';

const packageInfo = createRequire(import.meta.url)('../package.json') as {version?: string};
export const appVersion = packageInfo.version ?? '0.0.0';
