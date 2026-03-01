import { Target, TejFileUploader } from 'te.js';

const target = new Target('/user');

const uploader = new TejFileUploader({
  destination: 'public/uploads',
  maxFileSize: 5 * 1024 * 1024, // 5MB
});

// Single file upload - ammo.payload.image contains { filename, path, mimetype, size }
target.register(
  '/updateProfileImage',
  uploader.file('image'),
  (ammo) => {
    const { image } = ammo.payload;
    ammo.fire(200, {
      message: 'Profile image updated successfully!',
      file: image,
    });
  },
);

// Multi-file upload - ammo.payload.documents is an array of file objects
target.register(
  '/uploadDocuments',
  uploader.files('documents'),
  (ammo) => {
    const { documents } = ammo.payload;
    ammo.fire(200, {
      message: `${documents?.length ?? 0} document(s) uploaded`,
      files: documents,
    });
  },
);
