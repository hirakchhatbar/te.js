import status from "statuses";

const formattedData = (data) => {
  if (typeof data === "object") return JSON.stringify(data);
  if (typeof data === "string") return data;
  if (typeof data === "number") return status[data];
  return data;
};

const statusAndData = (args) => {
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
    contentType: contentType(data)
  };
};

const contentType = (data) => {
  switch (typeof data) {
    case "object":
      return "application/json";
    case "string":
      return "text/html";
    case "number":
      return "text/plain";
    default:
      return "text/plain";
  }
};

export { statusAndData, contentType };
