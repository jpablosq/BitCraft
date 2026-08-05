function getValueByPath(context, path) {
  return String(path)
    .split(".")
    .reduce(
      (currentValue, key) =>
        currentValue !== null &&
        currentValue !== undefined
          ? currentValue[key]
          : undefined,
      context,
    );
}

function evaluateCondition(
  condition,
  context,
) {
  const actualValue = getValueByPath(
    context,
    condition.field,
  );

  const expectedValue =
    condition.value;

  switch (condition.operator) {
    case "equals":
      return (
        String(actualValue ?? "") ===
        String(expectedValue ?? "")
      );

    case "not_equals":
      return (
        String(actualValue ?? "") !==
        String(expectedValue ?? "")
      );

    case "contains":
      if (Array.isArray(actualValue)) {
        return actualValue.some(
          (item) =>
            String(item).includes(
              String(expectedValue ?? ""),
            ),
        );
      }

      return String(
        actualValue ?? "",
      ).includes(
        String(expectedValue ?? ""),
      );

    default:
      throw new Error(
        `UNSUPPORTED_CONDITION_OPERATOR:${condition.operator}`,
      );
  }
}

function evaluateConditions({
  conditions = [],
  inputData = {},
}) {
  if (!Array.isArray(conditions)) {
    throw new Error(
      "INVALID_AUTOMATION_CONDITIONS",
    );
  }

  const context = {
    input: inputData,
    trigger: inputData,
  };

  const results = conditions.map(
    (condition, index) => {
      const passed = evaluateCondition(
        condition,
        context,
      );

      return {
        position: index + 1,
        field: condition.field,
        operator: condition.operator,
        expectedValue: condition.value,
        actualValue: getValueByPath(
          context,
          condition.field,
        ),
        passed,
      };
    },
  );

  return {
    passed: results.every(
      (result) => result.passed,
    ),
    results,
  };
}

module.exports = {
  evaluateConditions,
};