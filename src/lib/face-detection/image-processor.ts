import sharp from 'sharp';

/**
 * 画像処理クラス
 * 顔検出後の画像切り取りやサムネイル生成を行う
 */
export class ImageProcessor {
  /**
   * URLから画像をダウンロード
   */
  async downloadImage(url: string): Promise<Buffer> {
    console.log(`[ImageProcessor] Downloading image from: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`[ImageProcessor] Downloaded image size: ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      console.error('[ImageProcessor] Download failed:', error);
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * バウンディングボックスに基づいて顔を切り取る
   * @param imageBuffer 元画像のバッファ
   * @param boundingBox 顔の領域
   * @param padding パディング率（デフォルト: 0.2 = 20%）
   */
  async cropFace(
    imageBuffer: Buffer,
    boundingBox: { x: number; y: number; width: number; height: number },
    padding: number = 0.2
  ): Promise<Buffer> {
    console.log(`[ImageProcessor] Cropping face with bounding box:`, boundingBox);
    
    try {
      // 画像のメタデータを取得
      const metadata = await sharp(imageBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Failed to get image metadata');
      }

      // パディングを追加（顔の周りに余白を持たせる）
      const paddingX = Math.round(boundingBox.width * padding);
      const paddingY = Math.round(boundingBox.height * padding);
      
      // パディングを含めた切り取り領域を計算
      let left = Math.max(0, boundingBox.x - paddingX);
      let top = Math.max(0, boundingBox.y - paddingY);
      let width = Math.min(boundingBox.width + paddingX * 2, metadata.width - left);
      let height = Math.min(boundingBox.height + paddingY * 2, metadata.height - top);

      // アスペクト比を1:1に調整（正方形にする）
      if (width > height) {
        // 高さに合わせて幅を調整
        const diff = width - height;
        left = Math.max(0, left + Math.floor(diff / 2));
        width = height;
      } else if (height > width) {
        // 幅に合わせて高さを調整
        const diff = height - width;
        top = Math.max(0, top + Math.floor(diff / 2));
        height = width;
      }

      console.log(`[ImageProcessor] Adjusted crop region: left=${left}, top=${top}, width=${width}, height=${height}`);

      // 顔を切り取る
      const croppedBuffer = await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .jpeg({ quality: 90 })
        .toBuffer();

      console.log(`[ImageProcessor] Cropped face size: ${croppedBuffer.length} bytes`);
      return croppedBuffer;
      
    } catch (error) {
      console.error('[ImageProcessor] Crop failed:', error);
      throw new Error(`Failed to crop face: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * サムネイルを生成
   * @param imageBuffer 画像バッファ
   * @param size サムネイルのサイズ（正方形）
   */
  async createThumbnail(imageBuffer: Buffer, size: number = 150): Promise<Buffer> {
    console.log(`[ImageProcessor] Creating thumbnail with size: ${size}x${size}`);
    
    try {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      console.log(`[ImageProcessor] Thumbnail size: ${thumbnailBuffer.length} bytes`);
      return thumbnailBuffer;
      
    } catch (error) {
      console.error('[ImageProcessor] Thumbnail creation failed:', error);
      throw new Error(`Failed to create thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 画像の情報を取得
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: imageBuffer.length,
      };
    } catch (error) {
      console.error('[ImageProcessor] Failed to get metadata:', error);
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 画像が有効かチェック
   */
  async validateImage(imageBuffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      // 基本的な検証
      if (!metadata.width || !metadata.height) {
        return false;
      }
      
      // サイズ制限（幅・高さが100px以上、10000px以下）
      if (metadata.width < 100 || metadata.height < 100 ||
          metadata.width > 10000 || metadata.height > 10000) {
        return false;
      }
      
      // フォーマットチェック
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!metadata.format || !supportedFormats.includes(metadata.format)) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[ImageProcessor] Validation failed:', error);
      return false;
    }
  }
}

// シングルトンインスタンス
let imageProcessorInstance: ImageProcessor | null = null;

/**
 * ImageProcessorのシングルトンインスタンスを取得
 */
export function getImageProcessor(): ImageProcessor {
  if (!imageProcessorInstance) {
    imageProcessorInstance = new ImageProcessor();
  }
  return imageProcessorInstance;
}