const pool = require("./database");

const {
  decryptToken,
} = require("./tokenEncryption");

async function getActiveConnection(
  userId,
  provider,
) {
  const { rows } = await pool.query(
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
    rows[0]?.p_connection ?? null;

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

    accessToken: decryptToken(
      accessTokenEncrypted,
    ),

    refreshToken: decryptToken(
      refreshTokenEncrypted,
    ),
  };
}

module.exports = {
  getActiveConnection,
};