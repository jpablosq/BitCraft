const db = require("../config/db");

async function registerUser({ name, email, passwordHash }) {
  const query = `
    CALL public.sp_register_user(
      $1::varchar,
      $2::varchar,
      $3::varchar,
      NULL::bigint,
      NULL::timestamptz
    );
  `;

  const values = [
    name,
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
      NULL::boolean
    );
  `;

  const result = await db.query(query, [email]);

  return result.rows[0];
}

module.exports = {
  registerUser,
  loginUser,
};