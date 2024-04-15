import { Target, TejFileUploader } from 'te.js';

const target = new Target('/user');

const upload = new TejFileUploader({
  destination: 'uploads',
  name: 'profile_image',
  maxFileSize: 1024,
});

target.register(
  '/updateProfileImage',
  upload.single('image', 'imageB'),
  (ammo) => {
    ammo.fire(ammo.payload);
  },
);
