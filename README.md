# Image Processor - Next.js 14 Application

A modern, feature-rich image processing application built with Next.js 14, TypeScript, and Shadcn UI. This application allows users to upload, process, and transform images with real-time preview and comparison capabilities.

![Image Processor Demo](demo-screenshot.png)

## 🌟 Features

- **Image Upload**
  - Drag and drop support
  - Multi-file upload
  - Progress tracking
  - File type validation
  - Size restrictions (up to 10MB)

- **Image Processing**
  - Format conversion (JPG, PNG, WebP)
  - Quality adjustment
  - Resize capabilities
  - Image enhancement controls
    - Brightness
    - Contrast
    - Saturation
  - Compression options

- **Advanced Features**
  - Real-time image comparison
  - Processing confirmation dialog
  - Batch processing
  - Download processed images
  - Copy image URLs

## 🛠️ Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- Framer Motion
- Sharp and ImageMagick API wand(for image processing)
- Axios
- React Dropzone

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/image-processor.git
cd image-processor
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create a `.env.local` file:
```env
# Add any environment variables if needed
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts
│   │   └── process/
│   │       └── route.ts
│   └── page.tsx
├── components/
│   └── ui/
├── lib/
│   └── utils.ts
└── types/
    └── index.ts
```

## 🚀 Usage

1. **Upload Images**
   - Drag and drop images onto the upload zone
   - Or click to select files
   - Supported formats: JPG, PNG, WebP
   - Maximum file size: 10MB

2. **Configure Processing**
   - Select output format
   - Adjust quality settings
   - Enable/disable resize options
   - Configure enhancement settings
   - Set compression levels

3. **Process Images**
   - Review settings in confirmation dialog
   - Process multiple images at once
   - Monitor progress in real-time

4. **View & Download Results**
   - Compare original and processed images
   - Download processed images
   - Copy image URLs

## ⚙️ Configuration Options

### Image Processing Options

```typescript
interface ProcessingOptions {
  format: 'jpg' | 'png' | 'webp';
  quality: number;
  resize: {
    enabled: boolean;
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  };
  enhancement: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  compression: {
    enabled: boolean;
    level: number;
  };
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful components
- [Sharp](https://sharp.pixelplumbing.com/) for image processing capabilities
- [ImageMagick](imagemagick.org/development)
- [Next.js](https://nextjs.org/) team for the amazing framework



