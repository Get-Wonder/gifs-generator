import { S3Client } from '@aws-sdk/client-s3';

const s3Config = {
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!
  }
};

export const s3Client = new S3Client(s3Config);

export const getFileUrl = (bucket: string, key: string): string => {
  return `https://${bucket}.${process.env.DO_SPACES_REGION}.cdn.digitaloceanspaces.com/${key}`;
};
