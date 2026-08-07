const automationService = require(
  "../services/automation.service",
);


function getAutomationId(req) {
  const automationId =
    Number(req.params.id);

  if (
    !Number.isInteger(
      automationId,
    ) ||
    automationId <= 0
  ) {
    return null;
  }

  return automationId;
}

function isCronFieldValid(
  field,
  min,
  max,
) {
  const parts =
    String(field).split(",");

  return parts.every(
    (part) => {
      if (!part) {
        return false;
      }

      const stepParts =
        part.split("/");


      if (
        stepParts.length > 2
      ) {
        return false;
      }

      const [
        base,
        stepValue,
      ] = stepParts;


      if (
        stepValue !==
        undefined
      ) {
        const step =
          Number(stepValue);

        if (
          !Number.isInteger(
            step,
          ) ||
          step <= 0
        ) {
          return false;
        }
      }

      /*
       * Comodín.
       */
      if (base === "*") {
        return true;
      }

      /*
       * Rango.
       *
       * Ejemplo:
       * 1-5
       */
      if (
        base.includes("-")
      ) {
        const rangeParts =
          base.split("-");

        if (
          rangeParts.length !== 2
        ) {
          return false;
        }

        const [
          startValue,
          endValue,
        ] = rangeParts;

        const start =
          Number(startValue);

        const end =
          Number(endValue);

        return (
          Number.isInteger(
            start,
          ) &&
          Number.isInteger(
            end,
          ) &&
          start >= min &&
          start <= max &&
          end >= min &&
          end <= max &&
          start <= end
        );
      }

      /*
       * Valor individual.
       *
       * Ejemplo:
       * 8
       */
      const value =
        Number(base);

      return (
        Number.isInteger(
          value,
        ) &&
        value >= min &&
        value <= max
      );
    },
  );
}


/*
 * Valida una expresión cron
 * estándar de 5 campos:
 *
 * minuto
 * hora
 * día del mes
 * mes
 * día de la semana
 *
 * Ejemplo:
 *
 * 0 8 * * *
 */
function validateCronExpression(
  expression,
) {
  const normalizedExpression =
    String(
      expression ?? "",
    ).trim();

  if (
    !normalizedExpression
  ) {
    return false;
  }

  const fields =
    normalizedExpression.split(
      /\s+/,
    );

  if (
    fields.length !== 5
  ) {
    return false;
  }

  const [
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek,
  ] = fields;

  return (
    isCronFieldValid(
      minute,
      0,
      59,
    ) &&
    isCronFieldValid(
      hour,
      0,
      23,
    ) &&
    isCronFieldValid(
      dayOfMonth,
      1,
      31,
    ) &&
    isCronFieldValid(
      month,
      1,
      12,
    ) &&
    isCronFieldValid(
      dayOfWeek,
      0,
      7,
    )
  );
}


/*
 * Valida los datos utilizados
 * para crear o actualizar una
 * automatización.
 */
function validateAutomationBody(
  body,
) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return "Los datos de la automatización no son válidos.";
  }

  const {
    name,
    triggerType,
    triggerProvider,
    triggerEvent,
    triggerConfiguration,
    conditions,
    actions,
  } = body;

  /*
   * Nombre.
   */
  if (
    !name ||
    !String(name).trim()
  ) {
    return "El nombre es obligatorio.";
  }

  /*
   * Tipo de trigger.
   */
  if (!triggerType) {
    return "El tipo de disparador es obligatorio.";
  }

  if (
    ![
      "event",
      "schedule",
    ].includes(
      triggerType,
    )
  ) {
    return "El tipo de disparador no es válido.";
  }

  /*
   * Proveedor.
   */
  if (!triggerProvider) {
    return "El proveedor del disparador es obligatorio.";
  }

  /*
   * Evento.
   */
  if (!triggerEvent) {
    return "El evento del disparador es obligatorio.";
  }

  /*
   * Configuración del trigger.
   */
  if (
    triggerConfiguration !==
      undefined &&
    (
      typeof triggerConfiguration !==
        "object" ||
      triggerConfiguration ===
        null ||
      Array.isArray(
        triggerConfiguration,
      )
    )
  ) {
    return "La configuración del disparador no es válida.";
  }

  /*
   * =================================
   * TRIGGER DE GITHUB
   * =================================
   */
  if (
    triggerType === "event"
  ) {
    if (
      triggerProvider !==
        "github" ||
      triggerEvent !==
        "issue.created"
    ) {
      return "La configuración del disparador de GitHub no es válida.";
    }

    const repository =
      String(
        triggerConfiguration
          ?.repository ?? "",
      ).trim();

    if (!repository) {
      return "El repositorio de GitHub es obligatorio.";
    }

    const repositoryParts =
      repository.split("/");

    if (
      repositoryParts.length !==
        2 ||
      !repositoryParts[0] ||
      !repositoryParts[1]
    ) {
      return "El repositorio de GitHub debe utilizar el formato usuario/repositorio.";
    }
  }

  /*
   * =================================
   * TRIGGER PROGRAMADO
   * =================================
   */
  if (
    triggerType ===
    "schedule"
  ) {
    /*
     * Las automatizaciones
     * programadas deben utilizar:
     *
     * provider = system
     * event = cron
     */
    if (
      triggerProvider !==
        "system" ||
      triggerEvent !==
        "cron"
    ) {
      return "La configuración del disparador programado no es válida.";
    }

    const cronExpression =
      String(
        triggerConfiguration
          ?.cronExpression ?? "",
      ).trim();

    if (!cronExpression) {
      return "La expresión cron es obligatoria.";
    }

    if (
      !validateCronExpression(
        cronExpression,
      )
    ) {
      return "La expresión cron no es válida. Utiliza el formato: minuto hora día mes día-semana. Ejemplo: 0 8 * * *.";
    }
  }

  /*
   * Condiciones.
   */
  if (
    conditions !==
      undefined &&
    !Array.isArray(
      conditions,
    )
  ) {
    return "Las condiciones deben ser un arreglo.";
  }

  /*
   * Acciones.
   */
  if (
    !Array.isArray(
      actions,
    ) ||
    actions.length === 0
  ) {
    return "Debe agregar al menos una acción.";
  }

  return null;
}


function handleControllerError(
  error,
  res,
) {
  console.error(
    "Error en automatizaciones:",
    error,
  );

  if (
    error.code ===
    "22023"
  ) {
    return res
      .status(400)
      .json({
        success: false,

        message:
          error.message ||
          "Los datos de la automatización no son válidos.",
      });
  }

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Ocurrió un error al procesar la automatización.",
    });
}


/*
 * =================================
 * OBTENER AUTOMATIZACIONES
 * =================================
 */
async function getAutomations(
  req,
  res,
) {
  try {
    const automations =
      await automationService
        .getAutomations(
          req.userId,
        );

    return res
      .status(200)
      .json({
        success: true,
        automations,
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


/*
 * =================================
 * CREAR AUTOMATIZACIÓN
 * =================================
 */
async function createAutomation(
  req,
  res,
) {
  try {
    const validationError =
      validateAutomationBody(
        req.body,
      );

    if (validationError) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            validationError,
        });
    }

    const {
      name,
      triggerType,
      triggerProvider,
      triggerEvent,
      triggerConfiguration = {},
      conditions = [],
      actions,
    } = req.body;

    const automationId =
      await automationService
        .createAutomation({
          userId:
            req.userId,

          name,

          triggerType,

          triggerProvider,

          triggerEvent,

          triggerConfiguration,

          conditions,

          actions,
        });

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Automatización creada correctamente.",

        automationId,
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


/*
 * =================================
 * ACTUALIZAR AUTOMATIZACIÓN
 * =================================
 */
async function updateAutomation(
  req,
  res,
) {
  try {
    const automationId =
      getAutomationId(req);

    if (!automationId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El identificador de la automatización no es válido.",
        });
    }

    const validationError =
      validateAutomationBody(
        req.body,
      );

    if (validationError) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            validationError,
        });
    }

    const {
      name,
      triggerType,
      triggerProvider,
      triggerEvent,
      triggerConfiguration = {},
      conditions = [],
      actions,
      isActive = true,
    } = req.body;

    if (
      typeof isActive !==
      "boolean"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El estado de la automatización no es válido.",
        });
    }

    const updated =
      await automationService
        .updateAutomation({
          automationId,

          userId:
            req.userId,

          name,

          triggerType,

          triggerProvider,

          triggerEvent,

          triggerConfiguration,

          conditions,

          actions,

          isActive,
        });

    if (!updated) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "No se encontró la automatización.",
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Automatización actualizada correctamente.",
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


/*
 * =================================
 * ELIMINAR AUTOMATIZACIÓN
 * =================================
 */
async function deleteAutomation(
  req,
  res,
) {
  try {
    const automationId =
      getAutomationId(req);

    if (!automationId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El identificador de la automatización no es válido.",
        });
    }

    const deleted =
      await automationService
        .deleteAutomation(
          automationId,
          req.userId,
        );

    if (!deleted) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "No se encontró la automatización.",
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Automatización eliminada correctamente.",
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


/*
 * =================================
 * ACTIVAR / DESACTIVAR
 * =================================
 */
async function toggleAutomation(
  req,
  res,
) {
  try {
    const automationId =
      getAutomationId(req);

    if (!automationId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El identificador de la automatización no es válido.",
        });
    }

    const {
      isActive,
    } = req.body;

    if (
      typeof isActive !==
      "boolean"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El estado isActive debe ser verdadero o falso.",
        });
    }

    const updated =
      await automationService
        .toggleAutomation(
          automationId,
          req.userId,
          isActive,
        );

    if (!updated) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "No se encontró la automatización.",
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          isActive
            ? "Automatización activada correctamente."
            : "Automatización desactivada correctamente.",
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


/*
 * =================================
 * EJECUTAR AUTOMATIZACIÓN
 * =================================
 */
async function executeAutomation(
  req,
  res,
) {
  try {
    const automationId =
      getAutomationId(req);

    if (!automationId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "El identificador de la automatización no es válido.",
        });
    }

    const body =
      req.body || {};

    const idempotencyKey =
      String(
        req.get(
          "Idempotency-Key",
        ) ||
        body.idempotencyKey ||
        "",
      ).trim();

    if (
      !idempotencyKey
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Debe enviar una clave de idempotencia.",
        });
    }

    const inputData =
      body.inputData ?? {};

    if (
      typeof inputData !==
        "object" ||
      inputData === null ||
      Array.isArray(
        inputData,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Los datos de entrada deben ser un objeto.",
        });
    }

    const execution =
      await automationService
        .enqueueAutomationExecution({
          automationId,

          userId:
            req.userId,

          idempotencyKey,

          inputData,
        });

    return res
      .status(
        execution.created
          ? 202
          : 200,
      )
      .json({
        success: true,

        message:
          execution.created
            ? "Ejecución enviada correctamente."
            : "La ejecución ya había sido registrada.",

        executionId:
          execution.executionId,

        created:
          execution.created,
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


/*
 * =================================
 * HISTORIAL DE EJECUCIONES
 * =================================
 */
async function getAutomationExecutions(
  req,
  res,
) {
  try {
    let automationId =
      null;

    let limit = 50;

    if (
      req.query
        .automationId !==
        undefined &&
      req.query
        .automationId !==
        ""
    ) {
      automationId =
        Number(
          req.query
            .automationId,
        );

      if (
        !Number.isInteger(
          automationId,
        ) ||
        automationId <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "El identificador de la automatización no es válido.",
          });
      }
    }

    if (
      req.query.limit !==
      undefined
    ) {
      limit =
        Number(
          req.query.limit,
        );

      if (
        !Number.isInteger(
          limit,
        ) ||
        limit < 1 ||
        limit > 100
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "El límite debe estar entre 1 y 100.",
          });
      }
    }

    const executions =
      await automationService
        .getAutomationExecutions({
          userId:
            req.userId,

          automationId,

          limit,
        });

    return res
      .status(200)
      .json({
        success: true,
        executions,
      });
  } catch (error) {
    return handleControllerError(
      error,
      res,
    );
  }
}


module.exports = {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  executeAutomation,
  getAutomationExecutions,
};