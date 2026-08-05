function getValueByPath(context, path) {
  return String(path)
    .split(".")
    .reduce(
      (value, key) =>
        value !== null &&
        value !== undefined
          ? value[key]
          : undefined,
      context,
    );
}

function interpolateString(value, context) {
  const exactMatch = value.match(
    /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/,
  );

  if (exactMatch) {
    const resolvedValue = getValueByPath(
      context,
      exactMatch[1].trim(),
    );

    return resolvedValue !== undefined
      ? resolvedValue
      : value;
  }

  return value.replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (placeholder, path) => {
      const resolvedValue = getValueByPath(
        context,
        path.trim(),
      );

      if (
        resolvedValue === undefined ||
        resolvedValue === null
      ) {
        return placeholder;
      }

      if (typeof resolvedValue === "object") {
        return JSON.stringify(resolvedValue);
      }

      return String(resolvedValue);
    },
  );
}

function interpolateValue(value, context) {
  if (typeof value === "string") {
    return interpolateString(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      interpolateValue(item, context),
    );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          interpolateValue(item, context),
        ],
      ),
    );
  }

  return value;
}

module.exports = {
  interpolateValue,
};