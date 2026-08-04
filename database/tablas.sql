-- TABLA USERS

CREATE TABLE public.users (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(120) NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    avatar_url TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Evita correos repetidos sin importar mayúsculas
CREATE UNIQUE INDEX ux_users_email_lower
    ON public.users (LOWER(email));


-- Evita usernames repetidos sin importar mayúsculas
CREATE UNIQUE INDEX ux_users_username_lower
    ON public.users (LOWER(username));

-- TABLA: CONEXIONES DE SERVICIOS EXTERNOS
CREATE TABLE public.service_connections (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    account_email VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_connections_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_service_connections_provider
        CHECK (provider IN ('google', 'github')),

    CONSTRAINT uq_service_connections_user_provider
        UNIQUE (user_id, provider)
);

-- TABLA: AUTOMATIZACIONES
CREATE TABLE public.automations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    trigger_type VARCHAR(20) NOT NULL,
    trigger_provider VARCHAR(50) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    trigger_configuration JSONB NOT NULL
        DEFAULT '{}'::jsonb,
    conditions JSONB NOT NULL
        DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL
        DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_automations_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_automations_trigger_type
        CHECK (
            trigger_type IN ('event', 'schedule')
        ),
    CONSTRAINT chk_automations_trigger_provider
        CHECK (
            trigger_provider IN ('github', 'system')
        )
);

-- TABLA: ACCIONES DE AUTOMATIZACIONES
CREATE TABLE public.automation_actions (
    id BIGSERIAL PRIMARY KEY,
    automation_id BIGINT NOT NULL,
    position INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL
        DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_automation_actions_automation
        FOREIGN KEY (automation_id)
        REFERENCES public.automations(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_automation_actions_position
        CHECK (position > 0),

    CONSTRAINT chk_automation_actions_provider
        CHECK (provider IN ('google', 'github')),

    CONSTRAINT uq_automation_actions_position
        UNIQUE (automation_id, position)
);

-- TABLA: EJECUCIONES DE AUTOMATIZACIONES
CREATE TABLE public.automation_executions (
    id BIGSERIAL PRIMARY KEY,
    automation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL
        DEFAULT 'pending',
    input_data JSONB NOT NULL
        DEFAULT '{}'::jsonb,
    output_data JSONB,
    error_message TEXT,
    attempts INTEGER NOT NULL
        DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,

    CONSTRAINT fk_executions_automation
        FOREIGN KEY (automation_id)
        REFERENCES public.automations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_executions_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_execution_status
        CHECK (
            status IN (
                'pending',
                'processing',
                'success',
                'failed'
            )
        ),

    CONSTRAINT chk_execution_attempts
        CHECK (attempts >= 0),

    CONSTRAINT uq_execution_idempotency
    UNIQUE (
        user_id,
        automation_id,
        idempotency_key
    )
);