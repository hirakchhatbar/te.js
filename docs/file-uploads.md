# File Uploads

Tejas provides a built-in `TejFileUploader` class for handling file uploads with ease.

## Quick Start

```javascript
import { Target, TejFileUploader } from 'te.js';

const upload = new TejFileUploader({
  destination: 'uploads/',
  maxFileSize: 5 * 1024 * 1024 // 5MB
});

const target = new Target('/files');

target.register('/upload', upload.file('avatar'), (ammo) => {
  ammo.fire({ file: ammo.payload.avatar });
});
```

## Configuration

```javascript
const upload = new TejFileUploader({
  destination: 'public/uploads', // Where to save files
  name: 'custom-name',           // Optional: custom filename
  maxFileSize: 10 * 1024 * 1024  // Max file size in bytes (10MB)
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `destination` | string | Directory to save uploaded files |
| `name` | string | Optional custom filename |
| `maxFileSize` | number | Maximum file size in bytes |

## Single File Upload

Use `upload.file()` for single file uploads:

```javascript
// Expects a file field named 'avatar'
target.register('/avatar', upload.file('avatar'), (ammo) => {
  const file = ammo.payload.avatar;
  
  ammo.fire({
    filename: file.filename,
    path: file.path.relative,
    mimetype: file.mimetype,
    size: file.size
  });
});
```

### File Object Structure

When a file is uploaded, `ammo.payload[fieldName]` contains:

```javascript
{
  filename: 'photo.jpg',          // Original filename
  extension: 'jpg',               // File extension
  path: {
    absolute: '/var/www/uploads/photo.jpg',
    relative: 'uploads/photo.jpg'
  },
  mimetype: 'image/jpeg',         // MIME type
  size: {                         // File size object
    value: 245,
    symbol: 'KB',
    // ... other filesize properties
  }
}
```

## Multiple File Upload

Use `upload.files()` for multiple files:

```javascript
// Expects files in 'photos' and 'documents' fields
target.register('/documents', upload.files('photos', 'documents'), (ammo) => {
  const { photos, documents } = ammo.payload;
  
  ammo.fire({
    photos: photos || [],        // Array of file objects
    documents: documents || []   // Array of file objects
  });
});
```

### Multiple Files Response

Each field contains an array of file objects:

```javascript
{
  photos: [
    { filename: 'photo1.jpg', path: {...}, mimetype: 'image/jpeg', size: {...} },
    { filename: 'photo2.jpg', path: {...}, mimetype: 'image/jpeg', size: {...} }
  ],
  documents: [
    { filename: 'doc.pdf', path: {...}, mimetype: 'application/pdf', size: {...} }
  ]
}
```

## Mixed Fields (Files + Data)

File uploads can include regular form fields:

```javascript
target.register('/profile', upload.file('avatar'), (ammo) => {
  const { avatar, name, bio } = ammo.payload;
  
  ammo.fire({
    name,           // Regular form field
    bio,            // Regular form field
    avatar: avatar  // File object
  });
});
```

## File Size Limits

When a file exceeds `maxFileSize`, a `413 Payload Too Large` error is thrown:

```javascript
const upload = new TejFileUploader({
  destination: 'uploads/',
  maxFileSize: 2 * 1024 * 1024 // 2MB limit
});

target.register('/upload', upload.file('file'), (ammo) => {
  // If file > 2MB, this handler never runs
  // Client receives: 413 "File size exceeds 2 MB"
  ammo.fire({ success: true });
});
```

## Client-Side Examples

### HTML Form

```html
<form action="/files/upload" method="POST" enctype="multipart/form-data">
  <input type="file" name="avatar" />
  <input type="text" name="username" />
  <button type="submit">Upload</button>
</form>
```

### JavaScript (Fetch)

```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);
formData.append('username', 'john');

const response = await fetch('/files/upload', {
  method: 'POST',
  body: formData
});
```

### JavaScript (Multiple Files)

```javascript
const formData = new FormData();

// Add multiple files to same field
for (const file of fileInput.files) {
  formData.append('photos', file);
}

const response = await fetch('/files/documents', {
  method: 'POST',
  body: formData
});
```

## Complete Example

```javascript
import { Target, TejFileUploader, TejError } from 'te.js';
import fs from 'fs';
import path from 'path';

const target = new Target('/api/files');

// Configure uploader
const imageUpload = new TejFileUploader({
  destination: 'public/images',
  maxFileSize: 5 * 1024 * 1024 // 5MB
});

const documentUpload = new TejFileUploader({
  destination: 'private/documents',
  maxFileSize: 20 * 1024 * 1024 // 20MB
});

// Upload profile image
target.register('/profile-image', imageUpload.file('image'), (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();
  
  const { image } = ammo.payload;
  
  if (!image) {
    throw new TejError(400, 'No image provided');
  }
  
  // Validate image type
  if (!image.mimetype.startsWith('image/')) {
    // Delete uploaded file
    fs.unlinkSync(image.path.absolute);
    throw new TejError(400, 'File must be an image');
  }
  
  ammo.fire({
    message: 'Profile image uploaded',
    url: `/images/${image.filename}`
  });
});

// Upload multiple documents
target.register('/documents', documentUpload.files('files'), (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();
  
  const { files } = ammo.payload;
  
  if (!files || files.length === 0) {
    throw new TejError(400, 'No files provided');
  }
  
  ammo.fire({
    message: `${files.length} files uploaded`,
    files: files.map(f => ({
      name: f.filename,
      size: `${f.size.value} ${f.size.symbol}`
    }))
  });
});

// Delete a file
target.register('/delete/:filename', (ammo) => {
  if (!ammo.DELETE) return ammo.notAllowed();
  
  const { filename } = ammo.payload;
  const filepath = path.join('public/images', filename);
  
  if (!fs.existsSync(filepath)) {
    throw new TejError(404, 'File not found');
  }
  
  fs.unlinkSync(filepath);
  ammo.fire({ message: 'File deleted' });
});
```

## Validation Middleware

Create reusable validation middleware:

```javascript
// middleware/validate-image.js
import { TejError } from 'te.js';
import fs from 'fs';

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const validateImage = (fieldName) => (ammo, next) => {
  const file = ammo.payload[fieldName];
  
  if (!file) {
    throw new TejError(400, `${fieldName} is required`);
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    fs.unlinkSync(file.path.absolute);
    throw new TejError(400, 'Only JPEG, PNG, GIF, and WebP images are allowed');
  }
  
  next();
};

// Usage
target.register('/avatar',
  upload.file('avatar'),
  validateImage('avatar'),
  (ammo) => {
    ammo.fire({ success: true });
  }
);
```

## Serving Uploaded Files

Tejas doesn't include a static file server, but you can serve files manually:

```javascript
import fs from 'fs';
import path from 'path';
import mime from 'mime';

target.register('/images/:filename', (ammo) => {
  const { filename } = ammo.payload;
  const filepath = path.join('public/images', filename);
  
  if (!fs.existsSync(filepath)) {
    return ammo.notFound();
  }
  
  const file = fs.readFileSync(filepath);
  const contentType = mime.getType(filepath) || 'application/octet-stream';
  
  ammo.fire(200, file, contentType);
});
```

## Best Practices

1. **Validate file types** — Don't trust client-reported MIME types
2. **Set size limits** — Prevent disk exhaustion attacks
3. **Use unique filenames** — Avoid overwrites with UUID or timestamps
4. **Store outside web root** — For sensitive files, store in private directories
5. **Clean up on errors** — Delete uploaded files if validation fails
6. **Scan for malware** — For production systems, integrate virus scanning

