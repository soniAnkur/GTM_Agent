import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function createR2Client() {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? '';
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? '';

  if (!accessKeyId || !secretAccessKey || !accountId) {
    throw new Error('Cloudflare R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export async function uploadBufferToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME ?? '';
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? '';

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket name and public URL are required');
  }

  const r2 = createR2Client();
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const fileUrl = `${publicUrl}/${filename}`;
  console.log('Uploaded to R2:', fileUrl);
  return fileUrl;
}

export async function downloadAndUploadToR2(
  url: string,
  filename: string,
  contentType: string = 'image/png',
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return uploadBufferToR2(buffer, filename, contentType);
}
