export function serialize(data) {
  return JSON.stringify({
    __type: data === null ? 'null' : typeof data,
    value: data,
  });
}

export function deserialize(serialized) {
  const parsed = JSON.parse(serialized);
  if (!parsed || typeof parsed !== 'object' || !('__type' in parsed)) {
    return null;
  }

  switch (parsed.__type) {
    case 'string':
      return String(parsed.value);
    case 'number':
      return Number(parsed.value);
    case 'boolean':
      return Boolean(parsed.value);
    case 'object':
      return parsed.value;
    default:
      return parsed.value;
  }
}
