-- PROCEDURE de USERS

-- PROCEDURE 1: REGISTRAR USUARIO
CREATE OR REPLACE PROCEDURE public.sp_register_user(
    IN p_name VARCHAR(120),
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(255),
    IN p_password_hash VARCHAR(255),

    OUT p_user_id BIGINT,
    OUT p_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE LOWER(username) = LOWER(BTRIM(p_username))
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23505',
            MESSAGE = 'USERNAME_ALREADY_EXISTS';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE LOWER(email) = LOWER(BTRIM(p_email))
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23505',
            MESSAGE = 'EMAIL_ALREADY_EXISTS';
    END IF;

    INSERT INTO public.users (
        name,
        username,
        email,
        password_hash
    )
    VALUES (
        BTRIM(p_name),
        LOWER(BTRIM(p_username)),
        LOWER(BTRIM(p_email)),
        p_password_hash
    )
    RETURNING
        id,
        created_at
    INTO
        p_user_id,
        p_created_at;
END;
$$;

-- PROCEDURE 2: LOGIN
CREATE OR REPLACE PROCEDURE public.sp_login_user(
    IN p_email VARCHAR(255),

    OUT p_user_id BIGINT,
    OUT p_name VARCHAR(120),
    OUT p_username VARCHAR(50),
    OUT p_email_result VARCHAR(255),
    OUT p_password_hash VARCHAR(255),
    OUT p_avatar_url TEXT,
    OUT p_is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT
        id,
        name,
        username,
        email,
        password_hash,
        avatar_url,
        is_active
    INTO
        p_user_id,
        p_name,
        p_username,
        p_email_result,
        p_password_hash,
        p_avatar_url,
        p_is_active
    FROM public.users
    WHERE LOWER(email) = LOWER(BTRIM(p_email))
    LIMIT 1;
END;
$$;

-- PROCEDURE 3: OBTENER USUARIO AUTENTICADO POR ID
CREATE OR REPLACE PROCEDURE public.sp_get_user_by_id(
    IN p_user_id BIGINT,

    OUT p_id BIGINT,
    OUT p_name VARCHAR(120),
    OUT p_username VARCHAR(50),
    OUT p_email VARCHAR(255),
    OUT p_avatar_url TEXT,
    OUT p_is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT
        id,
        name,
        username,
        email,
        avatar_url,
        is_active
    INTO
        p_id,
        p_name,
        p_username,
        p_email,
        p_avatar_url,
        p_is_active
    FROM public.users
    WHERE id = p_user_id
    LIMIT 1;
END;
$$;