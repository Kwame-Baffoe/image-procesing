// First, let's create the API endpoints
// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ 
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true 
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileStream = fs.createReadStream(file.filepath);
    const key = `uploads/${Date.now()}-${path.basename(file.originalFilename || 'file')}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: file.mimetype || 'application/octet-stream',
    });

    await s3Client.send(uploadCommand);

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key,
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}

// pages/api/process.ts
import { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileUrl, options } = req.body;

    // Extract key from S3 URL
    const key = fileUrl.split('/').pop();
    
    // Get original file from S3
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${key}`,
    });

    const { Body } = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(Body as Readable);

    // Process image with Sharp
    let processedImage = sharp(imageBuffer);

    // Apply processing options
    if (options.resize.enabled) {
      processedImage = processedImage.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.maintainAspectRatio ? 'inside' : 'fill',
      });
    }

    // Apply enhancements
    if (Object.values(options.enhancement).some(v => v !== 0)) {
      processedImage = processedImage.modulate({
        brightness: 1 + (options.enhancement.brightness / 100),
        saturation: 1 + (options.enhancement.saturation / 100),
      });
      
      if (options.enhancement.contrast !== 0) {
        processedImage = processedImage.contrast(options.enhancement.contrast);
      }
      
      if (options.enhancement.sharpness > 0) {
        processedImage = processedImage.sharpen();
      }
    }

    // Add watermark if enabled
    if (options.watermark.enabled && options.watermark.text) {
      const watermark = await sharp({
        text: {
          text: options.watermark.text,
          font: 'Arial',
          fontSize: 48,
          rgba: true,
        },
      })
      .png()
      .toBuffer();

      processedImage = processedImage.composite([
        {
          input: watermark,
          gravity: options.watermark.position.replace('-', ' ') as sharp.Gravity,
        },
      ]);
    }

    // Convert to desired format
    const formatOptions: sharp.OutputOptions = {
      quality: options.quality,
    };

    if (options.compression.enabled) {
      formatOptions.compression = options.compression.level;
    }

    let outputBuffer;
    switch (options.format) {
      case 'jpg':
        outputBuffer = await processedImage.jpeg(formatOptions).toBuffer();
        break;
      case 'png':
        outputBuffer = await processedImage.png(formatOptions).toBuffer();
        break;
      case 'webp':
        outputBuffer = await processedImage.webp(formatOptions).toBuffer();
        break;
    }

    // Upload processed image to S3
    const processedKey = `processed/${Date.now()}-${key}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: processedKey,
      Body: outputBuffer,
      ContentType: `image/${options.format}`,
    });

    await s3Client.send(uploadCommand);

    res.status(200).json({
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${processedKey}`,
    });

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

// Utility function to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Modified handleFileUpload function in the React component
const handleFileUpload = async (fileItem: UploadableFile) => {
  const formData = new FormData();
  formData.append("file", fileItem.file);

  const controller = new AbortController();
  abortControllersRef.current.set(fileItem.id, controller);

  try {
    setFiles(current =>
      current.map(f =>
        f.id === fileItem.id
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      )
    );

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setFiles(current =>
          current.map(f =>
            f.id === fileItem.id && f.status === 'uploading'
              ? { ...f, progress }
              : f
          )
        );
      }
    };

    // Create a promise to handle the XHR upload
    const uploadPromise = new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);

    const response = await uploadPromise;
    const metadata = await getImageMetadata(fileItem.file);

    setFiles(current =>
      current.map(f =>
        f.id === fileItem.id
          ? {
              ...f,
              status: 'success',
              progress: 100,
              metadata,
              processedUrl: response.url
            }
          : f
      )
    );

  } catch (error) {
    if (error.name === 'AbortError') return;

    setFiles(current =>
      current.map(f =>
        f.id === fileItem.id
          ? {
              ...f,
              status: 'error',
              progress: 0,
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      )
    );

    throw error;
  } finally {
    abortControllersRef.current.delete(fileItem.id);
  }
};

// Modified processImages function
const processImages = async () => {
  setProcessing(true);
  setProcessingProgress(0);

  try {
    const successfulFiles = files.filter(f => f.status === 'success');
    
    for (let i = 0; i < successfulFiles.length; i++) {
      const file = successfulFiles[i];
      
      setFiles(current =>
        current.map(f =>
          f.id === file.id
            ? { ...f, status: 'processing', progress: 0 }
            : f
        )
      );

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: file.processedUrl,
          options: processingOptions
        })
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const result = await response.json();

      setFiles(current =>
        current.map(f =>
          f.id === file.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                processedUrl: result.url
              }
            : f
        )
      );

      setProcessingProgress(((i + 1) / successfulFiles.length) * 100);
    }

    setActiveTab('results');
  } catch (error) {
    setGlobalError(error instanceof Error ? error.message : 'Processing failed');
  } finally {
    setProcessing(false);
    setProcessingProgress(0);
  }
};