const db = require("../config/db");

async function saveConnection({
  userId,
  provider,
  providerAccountId,
  accountName,
  accountEmail,
  accessTokenEncrypted,
  refreshTokenEncrypted,
  tokenExpiresAt,
  scopes,
}) {
  const query = `
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
    );
  `;

  const values = [
    userId,
    provider,
    providerAccountId,
    accountName,
    accountEmail,
    accessTokenEncrypted,
    refreshTokenEncrypted,
    tokenExpiresAt,
    scopes,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

async function getConnections(userId) {
  const query = `
    CALL public.sp_get_service_connections(
      $1::bigint,
      NULL::jsonb
    );
  `;

  const result = await db.query(query, [userId]);

  return result.rows[0]?.p_connections ?? [];
}

async function revokeConnection(userId, provider) {
  const query = `
    CALL public.sp_revoke_service_connection(
      $1::bigint,
      $2::varchar,
      NULL::boolean
    );
  `;

  const result = await db.query(query, [
    userId,
    provider,
  ]);

  return result.rows[0]?.p_revoked ?? false;
}

module.exports = {
  saveConnection,
  getConnections,
  revokeConnection,
};