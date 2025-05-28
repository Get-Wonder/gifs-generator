import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, getFileUrl } from '../config/s3Config';

export const uploadFileToS3 = async (
  bucket: string,
  key: string,
  file: Buffer,
  contentType: string
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read'
    });

    await s3Client.send(command);
    return getFileUrl(bucket, key);
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}; 