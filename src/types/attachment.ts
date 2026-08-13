export interface ImageAttachment {
  path: string;
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  size: number;
  /** Rows of #RRGGBB pixels, sampled for a compact terminal thumbnail. */
  thumbnail: readonly (readonly string[])[];
}
