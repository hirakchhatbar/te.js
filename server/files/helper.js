import mime from 'mime';

const paths = (destination, filename) => {
  const dir = `${process.cwd()}\\${destination}`;
  const path = `${dir}\\${filename}`;

  const absolute = path;
  const relative = path.replace(process.cwd(), '');

  return { dir, absolute, relative };
};

const extAndType = (obj) => {
  const contentType = obj.headers['content-type'];
  const ext = mime.getExtension(contentType);
  const type = mime.getType(ext);
  return {
    ext,
    type,
  };
};

const extract = (contentDisposition, key) => {
  if (!contentDisposition) {
    return null;
  }

  const parts = contentDisposition.split(';').map((part) => part.trim());
  const part = parts.find((part) => part.startsWith(key));
  return part ? part?.split('=')[1]?.trim()?.replace(/"/g, '') : undefined;
};

export { extAndType, extract, paths };
