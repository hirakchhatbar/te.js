import status from 'statuses';

const formattedData = (data) => {
  if (typeof data === 'object') return JSON.stringify(data);
  if (typeof data === 'string') return data;
  if (typeof data === 'number') return status[data];
  return data;
};

const statusAndData = (args) => {
  if (!args || args.length === 0)
    return {
      statusCode: 204,
      data: status(204),
      contentType: 'text/plain',
    };

  if (args.length === 1 && typeof args[0] === 'number')
    return {
      statusCode: args[0],
      data: status(args[0]),
      contentType: 'text/plain',
    };

  let statusCode = 200;
  let data = args[0];
  if (args.length > 1) {
    statusCode = args[0];
    data = args[1];
    if (!data) data = status[statusCode];
  }

  return {
    statusCode,
    data: formattedData(data),
    contentType: contentType(data),
  };
};

const contentType = (data) => {
  switch (typeof data) {
    case 'object':
      return 'application/json';
    case 'string':
      return 'text/html';
    case 'number':
      return 'text/plain';
    default:
      return 'text/plain';
  }
};

export { statusAndData, contentType };
