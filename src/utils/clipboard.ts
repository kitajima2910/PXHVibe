import {spawn} from 'node:child_process';

export function copyTextToClipboard(value: string): Promise<void> {
  if (process.platform !== 'win32') {
    return Promise.reject(new Error('Copy clipboard hiện chỉ hỗ trợ Windows.'));
  }
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-STA',
      '-Command',
      "$OutputEncoding=[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); Set-Clipboard -Value ([Console]::In.ReadToEnd())",
    ], {windowsHide: true, stdio: ['pipe', 'ignore', 'pipe']});
    let errorText = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { errorText += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errorText.trim() || 'Không thể copy vào clipboard.'));
    });
    child.stdin.end(value);
  });
}
