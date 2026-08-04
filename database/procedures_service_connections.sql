-- PROCEDURE de SERVICE CONNECTIONS

-- PROCEDURE 1: GUARDAR O ACTUALIZAR CONEXIÓN
CREATE OR REPLACE PROCEDURE public.sp_save_service_connection(
    IN p_user_id BIGINT,
    IN p_provider VARCHAR(20),
    IN p_provider_account_id VARCHAR(255),
    IN p_account_name VARCHAR(255),
    IN p_account_email VARCHAR(255),
    IN p_access_token_encrypted TEXT,
    IN p_refresh_token_encrypted TEXT,
    IN p_token_expires_at TIMESTAMPTZ,
    IN p_scopes TEXT,

    OUT p_connection_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_provider VARCHAR(20);
BEGIN
    v_provider := LOWER(BTRIM(p_provider));

    IF v_provider NOT IN ('google', 'github') THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_PROVIDER';
    END IF;

    IF p_access_token_encrypted IS NULL
       OR BTRIM(p_access_token_encrypted) = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'ACCESS_TOKEN_REQUIRED';
    END IF;

    INSERT INTO public.service_connections (
        user_id,
        provider,
        provider_account_id,
        account_name,
        account_email,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        scopes,
        is_active,
        connected_at
    )
    VALUES (
        p_user_id,
        v_provider,
        BTRIM(p_provider_account_id),
        NULLIF(BTRIM(p_account_name), ''),
        NULLIF(LOWER(BTRIM(p_account_email)), ''),
        p_access_token_encrypted,
        p_refresh_token_encrypted,
        p_token_expires_at,
        p_scopes,
        TRUE,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT ON CONSTRAINT uq_service_connections_user_provider
    DO UPDATE SET
        provider_account_id = EXCLUDED.provider_account_id,
        account_name = EXCLUDED.account_name,
        account_email = EXCLUDED.account_email,
        access_token_encrypted = EXCLUDED.access_token_encrypted,

        refresh_token_encrypted = COALESCE(
            EXCLUDED.refresh_token_encrypted,
            service_connections.refresh_token_encrypted
        ),

        token_expires_at = EXCLUDED.token_expires_at,
        scopes = EXCLUDED.scopes,
        is_active = TRUE,
        connected_at = CURRENT_TIMESTAMP

    RETURNING id
    INTO p_connection_id;
END;
$$;

-- PROCEDURE 2: CONSULTAR CONEXIONES ACTIVAS
CREATE OR REPLACE PROCEDURE public.sp_get_service_connections(
    IN p_user_id BIGINT,

    OUT p_connections JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', id,
                'provider', provider,
                'providerAccountId', provider_account_id,
                'accountName', account_name,
                'accountEmail', account_email,
                'scopes', scopes,
                'connectedAt', connected_at
            )
            ORDER BY provider
        ),
        '[]'::JSONB
    )
    INTO p_connections
    FROM public.service_connections
    WHERE user_id = p_user_id
      AND is_active = TRUE;
END;
$$;

-- PROCEDURE 3: REVOCAR CONEXIÓN
CREATE OR REPLACE PROCEDURE public.sp_revoke_service_connection(
    IN p_user_id BIGINT,
    IN p_provider VARCHAR(20),

    OUT p_revoked BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    UPDATE public.service_connections
    SET
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        token_expires_at = NULL,
        is_active = FALSE

    WHERE user_id = p_user_id
      AND provider = LOWER(BTRIM(p_provider))
      AND is_active = TRUE;

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    p_revoked := v_affected_rows > 0;
END;
$$;