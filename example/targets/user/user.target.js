import { Target, TejFileUploader } from 'te.js';

const target = new Target('/user');

const upload = new TejFileUploader({
  destination: 'public/uploads',
  maxFileSize: 5 * 1024 * 1024,
});

target.register(
  '/updateProfileImage',
  upload.files('photos', 'covers'),
  (ammo) => {
    console.log(ammo.payload);
    ammo.fire('Profile image updated successfully!')
  },
);
