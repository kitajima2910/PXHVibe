import {execFile} from 'node:child_process';
import {stat, unlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import type {ImageAttachment} from '../types/attachment.js';

interface ClipboardPayload {
  path: string;
  width: number;
  height: number;
  pixels: string[][];
}

export const thumbnailSize = 5;

const clipboardScript = String.raw`
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$source = [Windows.Forms.Clipboard]::GetImage()
if ($null -eq $source -and [Windows.Forms.Clipboard]::ContainsFileDropList()) {
  $candidate = [Windows.Forms.Clipboard]::GetFileDropList() |
    Where-Object { $_ -match '\.(png|jpe?g|webp|bmp|gif)$' } |
    Select-Object -First 1
  if ($null -ne $candidate) { $source = [Drawing.Image]::FromFile($candidate) }
}
if ($null -eq $source) { throw 'Clipboard không chứa ảnh.' }
$folder = Join-Path ([IO.Path]::GetTempPath()) 'pxhvibe-images'
[IO.Directory]::CreateDirectory($folder) | Out-Null
$file = Join-Path $folder (('clipboard-{0}.png' -f [guid]::NewGuid().ToString('N')))
$source.Save($file, [Drawing.Imaging.ImageFormat]::Png)
$thumbWidth = ${thumbnailSize}
$thumbHeight = ${thumbnailSize}
$scale = [Math]::Min($thumbWidth / $source.Width, $thumbHeight / $source.Height)
$drawWidth = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
$drawHeight = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
$drawX = [int][Math]::Floor(($thumbWidth - $drawWidth) / 2)
$drawY = [int][Math]::Floor(($thumbHeight - $drawHeight) / 2)
$thumb = [Drawing.Bitmap]::new($thumbWidth, $thumbHeight)
$graphics = [Drawing.Graphics]::FromImage($thumb)
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.Clear([Drawing.Color]::FromArgb(24, 24, 24))
$graphics.DrawImage($source, $drawX, $drawY, $drawWidth, $drawHeight)
$pixels = @()
for ($y = 0; $y -lt $thumbHeight; $y++) {
  $row = @()
  for ($x = 0; $x -lt $thumbWidth; $x++) {
    $color = $thumb.GetPixel($x, $y)
    $row += ('#{0:X2}{1:X2}{2:X2}' -f $color.R, $color.G, $color.B)
  }
  $pixels += ,$row
}
$graphics.Dispose()
$thumb.Dispose()
$width = $source.Width
$height = $source.Height
$source.Dispose()
@{ path = $file; width = $width; height = $height; pixels = $pixels } | ConvertTo-Json -Compress -Depth 5
`;

export async function pasteImageFromClipboard(): Promise<ImageAttachment> {
  if (process.platform !== 'win32') {
    throw new Error('Dán ảnh clipboard hiện chỉ hỗ trợ Windows.');
  }

  const stdout = await runPowerShell(clipboardScript);
  const payload = parseClipboardPayload(stdout);
  const fileStat = await stat(payload.path);
  return {
    path: payload.path,
    name: path.basename(payload.path),
    mimeType: 'image/png',
    width: payload.width,
    height: payload.height,
    size: fileStat.size,
    thumbnail: payload.pixels,
  };
}

export async function removeTemporaryImage(attachment: ImageAttachment): Promise<void> {
  const imageDirectory = path.resolve(tmpdir(), 'pxhvibe-images');
  if (
    path.dirname(path.resolve(attachment.path)) !== imageDirectory
    || !path.basename(attachment.path).startsWith('clipboard-')
  ) return;
  await unlink(attachment.path).catch(() => undefined);
}

export function parseClipboardPayload(stdout: string): ClipboardPayload {
  const payload = JSON.parse(stdout.trim()) as Partial<ClipboardPayload>;
  if (
    typeof payload.path !== 'string'
    || typeof payload.width !== 'number'
    || typeof payload.height !== 'number'
    || !Array.isArray(payload.pixels)
  ) {
    throw new Error('Không đọc được dữ liệu ảnh từ clipboard.');
  }
  return payload as ClipboardPayload;
}

function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-Command', script],
      {encoding: 'utf8', windowsHide: true, maxBuffer: 2 * 1024 * 1024},
      (error, stdout, stderr) => {
        if (error !== null) {
          const detail = stderr.trim();
          reject(new Error(
            detail.includes('Clipboard không chứa ảnh')
              ? 'Clipboard không chứa ảnh. Hãy sao chép ảnh rồi nhấn Alt+V hoặc gõ /paste.'
              : (detail.split(/\r?\n/, 1)[0] || error.message),
          ));
          return;
        }
        resolve(stdout);
      },
    );
  });
}
