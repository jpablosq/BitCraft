const db = require("../config/db");

async function registerUser({
  name,
  username,
  email,
  passwordHash,
}) {
  const query = `
    CALL public.sp_register_user(
      $1::varchar,
      $2::varchar,
      $3::varchar,
      $4::varchar,
      NULL::bigint,
      NULL::timestamptz
    );
  `;

  const values = [
    name,
    username,
    email,
    passwordHash,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

async function loginUser(email) {
  const query = `
    CALL public.sp_login_user(
      $1::varchar,
      NULL::bigint,
      NULL::varchar,
      NULL::varchar,
      NULL::varchar,
      NULL::varchar,
      NULL::text,
      NULL::boolean
    );
  `;

  const result = await db.query(query, [email]);

  return result.rows[0];
}

async function getUserById(userId) {
  const query = `
    CALL public.sp_get_user_by_id(
        $1::bigint,
        NULL::bigint,
        NULL::varchar,
        NULL::varchar,
        NULL::varchar,
        NULL::text,
        NULL::boolean
    );
  `;

  const result = await db.query(query, [userId]);

  return result.rows[0];
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
};