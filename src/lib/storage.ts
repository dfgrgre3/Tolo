import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { logger } from "./logger";

// Standardize S3 Storage for 10M+ Users
// 1. Scalability: Offload storage from local disk to S3
// 2. Performance: Deliver via CloudFront CDN
// 3. Security: Use OAC for private bucket access and Signed URLs for premium content

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  }
});

export class StorageService {
  /**
   * Uploads a file to S3 and returns the CloudFront URL
   */
  static async uploadFile(file: File | Buffer, fileName: string, contentType: string, folder: string = "books"): Promise<string> {
    const key = `uploads/${folder}/${fileName}`;
    const bucket = process.env.S3_BUCKET_NAME || `thanawy-assets-${process.env.NODE_ENV}`;

    try {
      const body = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType
        }
      });

      await upload.done();

      // Return the CloudFront URL for distribution
      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
      return `${cdnUrl}/${key}`;
    } catch (error) {
      logger.error(`S3 Upload Failed for ${key}:`, error);
      throw new Error(`Failed to upload file to S3 bucket [${bucket}] after multiple attempts.`);
    }
  }

  /**
   * Generates a signed URL for private access to protected content
   */
  static async getPrivateUrl(url: string, expiresSeconds: number = 3600): Promise<string> {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
    const key = url.replace(`${cdnUrl}/`, "");
    const bucket = process.env.S3_BUCKET_NAME || `thanawy-assets-${process.env.NODE_ENV}`;

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      // For 10M+ users, signed URLs are generated at the edge or app layer to avoid DB hits
      return await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
    } catch (error) {
      logger.error(`Failed to generate signed URL for ${key}:`, error);
      return url; // Fallback to public URL if signing fails
    }
  }

  /**
   * Deletes a file from S3 using its CDN URL
   */
  static async deleteFile(url: string): Promise<void> {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
    if (!url.startsWith(cdnUrl)) {
      logger.warn(`Storage: Attempted to delete external or local URL via S3 client: ${url}`);
      return;
    }

    const key = url.replace(`${cdnUrl}/`, "");
    const bucket = process.env.S3_BUCKET_NAME || `thanawy-assets-${process.env.NODE_ENV}`;

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      }));
      logger.info(`Storage: Deleted ${key} from S3`);
    } catch (error) {
      logger.error(`S3 Delete Failed for ${key}:`, error);
    }
  }
}

export default StorageService;