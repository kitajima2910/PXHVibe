import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {logTaskToHmc} from '../utils/hmcLog.js';

const dir = mkdtempSync(path.join(tmpdir(), 'hmc-log-'));
try {
  const target = 'Tạo giúp tôi game bắn xe tank 2D HTML5';

  const filePath = logTaskToHmc(dir, target);
  assert.equal(filePath, path.join(dir, 'PXH_HMC.md'));
  let content = readFileSync(filePath, 'utf8');
  assert.match(content, /^# PXH_HMC\.md - Change Log/);
  assert.match(content, /### Task hoàn thành/);
  assert.match(content, /- TARGET: Tạo giúp tôi game bắn xe tank 2D HTML5/);

  logTaskToHmc(dir, target);
  content = readFileSync(filePath, 'utf8');
  assert.equal(content.match(/### Task hoàn thành/g)?.length, 2, 'append giữ header và thêm entry thứ 2');

  rmSync(dir, {recursive: true, force: true});

  const existing = mkdtempSync(path.join(tmpdir(), 'hmc-log-existing-'));
  writeFileSync(path.join(existing, 'PXH_HMC.md'), '# X\n\n## 2026-09-03\n\nxưa cũ', 'utf8');
  const existingPath = logTaskToHmc(existing, 'Sửa lỗi đăng nhập');
  const existingContent = readFileSync(existingPath, 'utf8');
  assert.match(existingContent, /xưa cũ/);
  assert.match(existingContent, /### Task hoàn thành/);
  assert.match(existingContent, /- TARGET: Sửa lỗi đăng nhập/);
  rmSync(existing, {recursive: true, force: true});

  console.log('hmcLog tests passed.');
} finally {
  if (existsSync(dir)) rmSync(dir, {recursive: true, force: true});
}
