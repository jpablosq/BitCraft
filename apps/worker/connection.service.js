const pool = require("./database");

const {
  encryptToken,
  decryptToken,
} = require("./tokenEncryption");


async function getActiveConnection(
  userId,
  provider,
) {
  const { rows } =
    await pool.query(
      `
        CALL public.sp_get_active_service_connection(
          $1::bigint,
          $2::varchar,
          NULL::jsonb
        )
      `,
      [
        userId,
        provider,
      ],
    );

  const connection =
    rows[0]?.p_connection ??
    null;

  if (!connection) {
    return null;
  }

  const {
    accessTokenEncrypted,
    refreshTokenEncrypted,
    ...connectionData
  } = connection;

  return {
    ...connectionData,

    accessToken:
      decryptToken(
        accessTokenEncrypted,
      ),

    refreshToken:
      decryptToken(
        refreshTokenEncrypted,
      ),
  };
}


async function saveRefreshedTokens({
  connection,
  accessToken,
  refreshToken = null,
  expiresAt = null,
}) {
  if (!connection) {
    throw new Error(
      "SERVICE_CONNECTION_REQUIRED",
    );
  }

  if (!accessToken) {
    throw new Error(
      "ACCESS_TOKEN_REQUIRED",
    );
  }

  const accessTokenEncrypted =
    encryptToken(
      accessToken,
    );

  const refreshTokenEncrypted =
    refreshToken
      ? encryptToken(
          refreshToken,
        )
      : null;

  const { rows } =
    await pool.query(
      `
        CALL public.sp_save_service_connection(
          $1::bigint,
          $2::varchar,
          $3::varchar,
          $4::varchar,
          $5::varchar,
          $6::text,
          $7::text,
          $8::timestamptz,
          $9::text,
          NULL::bigint
        )
      `,
      [
        connection.userId,
        connection.provider,
        connection.providerAccountId,
        connection.accountName,
        connection.accountEmail,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        connection.scopes,
      ],
    );

  return (
    rows[0]?.p_connection_id ??
    null
  );
}


module.exports = {
  getActiveConnection,
  saveRefreshedTokens,
};