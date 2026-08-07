const GoogleAdapter = require(
  "../../packages/providers/GoogleAdapter",
);

const GitHubAdapter = require(
  "../../packages/providers/GitHubAdapter",
);

const pool = require("./database");

const {
  getActiveConnection,
  saveRefreshedTokens,
} = require("./connection.service");

const {
  interpolateValue,
} = require("./interpolation");


function createGoogleAdapter() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  } = process.env;

  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REDIRECT_URI
  ) {
    throw new Error(
      "GOOGLE_CONFIGURATION_REQUIRED",
    );
  }

  return new GoogleAdapter({
    clientId:
      GOOGLE_CLIENT_ID,

    clientSecret:
      GOOGLE_CLIENT_SECRET,

    redirectUri:
      GOOGLE_REDIRECT_URI,
  });
}


function createGitHubAdapter() {
  const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI,
  } = process.env;

  if (
    !GITHUB_CLIENT_ID ||
    !GITHUB_CLIENT_SECRET ||
    !GITHUB_REDIRECT_URI
  ) {
    throw new Error(
      "GITHUB_CONFIGURATION_REQUIRED",
    );
  }

  return new GitHubAdapter({
    clientId:
      GITHUB_CLIENT_ID,

    clientSecret:
      GITHUB_CLIENT_SECRET,

    redirectUri:
      GITHUB_REDIRECT_URI,
  });
}


function parseRepository(
  repository,
) {
  const parts =
    String(
      repository ?? "",
    )
      .trim()
      .split("/");

  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1]
  ) {
    throw new Error(
      "GITHUB_REPOSITORY_FORMAT_INVALID",
    );
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}


async function executeGoogleAction({
  action,
  userId,
  configuration,
}) {
  const connection =
    await getActiveConnection(
      userId,
      "google",
    );

  if (
    !connection?.accessToken
  ) {
    throw new Error(
      "GOOGLE_CONNECTION_NOT_FOUND",
    );
  }

  const adapter =
    createGoogleAdapter();

  if (
    action.actionName ===
    "send_email"
  ) {
    return adapter.sendEmail({
      accessToken:
        connection.accessToken,

      refreshToken:
        connection.refreshToken,

      /*
       * La fecha almacenada en PostgreSQL
       * se pasa al cliente OAuth de Google
       * para que pueda detectar si el
       * access token está vencido.
       */
      expiresAt:
        connection.tokenExpiresAt,

      to:
        configuration.to,

      subject:
        configuration.subject,

      body:
        configuration.body,

      /*
       * Cuando Google renueva el access
       * token utilizando el refresh token,
       * GoogleAdapter ejecuta este callback.
       *
       * El nuevo token se cifra y vuelve
       * a guardar en PostgreSQL.
       */
      onTokensRefreshed:
        async ({
          accessToken,
          refreshToken,
          expiresAt,
        }) => {
          await saveRefreshedTokens({
            connection,

            accessToken,

            refreshToken,

            expiresAt,
          });

          console.log(
            "[Worker] Tokens de Google renovados y guardados correctamente.",
          );
        },
    });
  }

  throw new Error(
    `UNSUPPORTED_GOOGLE_ACTION:${action.actionName}`,
  );
}


async function executeGitHubAction({
  action,
  userId,
  configuration,
}) {
  const connection =
    await getActiveConnection(
      userId,
      "github",
    );

  if (
    !connection?.accessToken
  ) {
    throw new Error(
      "GITHUB_CONNECTION_NOT_FOUND",
    );
  }

  const adapter =
    createGitHubAdapter();

  const {
    owner,
    repo,
  } = parseRepository(
    configuration.repository,
  );

  if (
    action.actionName ===
    "create_issue"
  ) {
    return adapter.createIssue({
      accessToken:
        connection.accessToken,

      owner,
      repo,

      title:
        configuration.title,

      body:
        configuration.body,
    });
  }

  if (
    action.actionName ===
    "add_comment"
  ) {
    return adapter.addComment({
      accessToken:
        connection.accessToken,

      owner,
      repo,

      issueNumber:
        configuration.issueNumber,

      body:
        configuration.body,
    });
  }

  throw new Error(
    `UNSUPPORTED_GITHUB_ACTION:${action.actionName}`,
  );
}


async function executeAction({
  action,
  userId,
  context,
}) {
  const configuration =
    interpolateValue(
      action.configuration ?? {},
      context,
    );

  if (
    action.provider ===
    "google"
  ) {
    return executeGoogleAction({
      action,
      userId,
      configuration,
    });
  }

  if (
    action.provider ===
    "github"
  ) {
    return executeGitHubAction({
      action,
      userId,
      configuration,
    });
  }

  throw new Error(
    `UNSUPPORTED_PROVIDER:${action.provider}`,
  );
}


/*
 * Crea o recupera el registro de
 * una acción dentro de una ejecución.
 *
 * Si la acción ya fue completada
 * anteriormente, p_should_execute
 * será false.
 */
async function startActionExecution({
  executionId,
  action,
}) {
  const { rows } =
    await pool.query(
      `
        CALL public.sp_start_automation_action_execution(
          $1::bigint,
          $2::integer,
          $3::varchar,
          $4::varchar,
          NULL::bigint,
          NULL::boolean,
          NULL::jsonb
        )
      `,
      [
        executionId,
        action.position,
        action.provider,
        action.actionName,
      ],
    );

  return {
    actionExecutionId:
      rows[0]
        ?.p_action_execution_id,

    shouldExecute:
      rows[0]
        ?.p_should_execute ??
      false,

    resultData:
      rows[0]
        ?.p_result_data ??
      null,
  };
}


/*
 * Marca una acción como completada
 * correctamente y almacena su resultado.
 */
async function completeActionExecution({
  actionExecutionId,
  result,
}) {
  await pool.query(
    `
      CALL public.sp_complete_automation_action_execution(
        $1::bigint,
        $2::jsonb
      )
    `,
    [
      actionExecutionId,

      JSON.stringify(
        result ?? {},
      ),
    ],
  );
}


/*
 * Registra que una acción falló.
 */
async function failActionExecution({
  actionExecutionId,
  errorMessage,
}) {
  await pool.query(
    `
      CALL public.sp_fail_automation_action_execution(
        $1::bigint,
        $2::text
      )
    `,
    [
      actionExecutionId,
      errorMessage,
    ],
  );
}


/*
 * Ejecuta las acciones de una
 * automatización en orden.
 *
 * La idempotencia se maneja
 * individualmente.
 *
 * Una acción que ya terminó
 * correctamente no vuelve a
 * ejecutarse durante un reintento
 * del trabajo de BullMQ.
 */
async function executeAutomationActions({
  automation,
  executionId,
  userId,
  inputData = {},
}) {
  if (!executionId) {
    throw new Error(
      "EXECUTION_ID_REQUIRED",
    );
  }

  const orderedActions = [
    ...automation.actions,
  ].sort(
    (
      firstAction,
      secondAction,
    ) =>
      firstAction.position -
      secondAction.position,
  );

  const context = {
    input:
      inputData,

    trigger:
      inputData,

    steps: {},
  };

  const results = [];

  for (
    const action
    of orderedActions
  ) {
    const actionExecution =
      await startActionExecution({
        executionId,
        action,
      });

    if (
      !actionExecution
        .actionExecutionId
    ) {
      throw new Error(
        `ACTION_EXECUTION_NOT_CREATED:${action.position}`,
      );
    }

    /*
     * Si la acción ya terminó
     * correctamente en un intento
     * anterior, no se vuelve a ejecutar.
     */
    if (
      !actionExecution
        .shouldExecute
    ) {
      console.log(
        `[Worker] Acción ${action.position} ya completada. Se omite.`,
        {
          provider:
            action.provider,

          actionName:
            action.actionName,
        },
      );

      const previousResult =
        actionExecution
          .resultData ?? {};

      /*
       * Restauramos el resultado previo
       * dentro de context.steps.
       *
       * Esto permite que acciones
       * posteriores continúen utilizando:
       *
       * {{steps.1...}}
       * {{steps.2...}}
       */
      context.steps[
        String(
          action.position,
        )
      ] = previousResult;

      results.push({
        position:
          action.position,

        provider:
          action.provider,

        actionName:
          action.actionName,

        skipped:
          true,

        reason:
          "ALREADY_COMPLETED",

        result:
          previousResult,
      });

      continue;
    }

    console.log(
      `[Worker] Ejecutando acción ${action.position}:`,
      {
        provider:
          action.provider,

        actionName:
          action.actionName,
      },
    );

    try {
      const result =
        await executeAction({
          action,
          userId,
          context,
        });

      await completeActionExecution({
        actionExecutionId:
          actionExecution
            .actionExecutionId,

        result,
      });

      /*
       * Guardamos el resultado de la
       * acción dentro del contexto para
       * permitir interpolaciones en
       * acciones posteriores.
       */
      context.steps[
        String(
          action.position,
        )
      ] = result;

      results.push({
        position:
          action.position,

        provider:
          action.provider,

        actionName:
          action.actionName,

        result,
      });

      console.log(
        `[Worker] Acción ${action.position} completada correctamente.`,
      );
    } catch (error) {
      try {
        await failActionExecution({
          actionExecutionId:
            actionExecution
              .actionExecutionId,

          errorMessage:
            error.message,
        });
      } catch (
        databaseError
      ) {
        console.error(
          `[Worker] No se pudo registrar el fallo de la acción ${action.position}:`,
          databaseError.message,
        );
      }

      throw error;
    }
  }

  return results;
}


module.exports = {
  executeAutomationActions,
};