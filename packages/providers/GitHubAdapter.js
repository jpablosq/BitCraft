const {
  AuthorizationCode,
} = require("simple-oauth2");

const axios = require("axios");

class GitHubAdapter {
  constructor({
    clientId,
    clientSecret,
    redirectUri,
  }) {
    this.client = new AuthorizationCode({
      client: {
        id: clientId,
        secret: clientSecret,
      },

      auth: {
        tokenHost: "https://github.com",
        authorizePath:
          "/login/oauth/authorize",
        tokenPath:
          "/login/oauth/access_token",
      },
    });

    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state) {
    return this.client.authorizeURL({
      redirect_uri: this.redirectUri,
      scope:
        "read:user user:email repo",
      state,
    });
  }

  async exchangeCodeForTokens(code) {
    const token =
      await this.client.getToken(
        {
          code,
          redirect_uri:
            this.redirectUri,
        },
        {
          headers: {
            Accept:
              "application/json",
          },
        },
      );

    const accessToken =
      token.token.access_token;

    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scopes:
        token.token.scope ??
        "read:user user:email repo",
    };
  }

  async getAuthenticatedUser(
    accessToken,
  ) {
    const { data } = await axios.get(
      "https://api.github.com/user",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          Accept:
            "application/vnd.github+json",
        },
      },
    );

    let email = null;

    try {
      const response =
        await axios.get(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              Accept:
                "application/vnd.github+json",
            },
          },
        );

      const primaryEmail =
        response.data.find(
          (currentEmail) =>
            currentEmail.primary,
        );

      email =
        primaryEmail?.email ?? null;
    } catch (error) {
      console.warn(
        "No fue posible obtener el correo de GitHub",
      );
    }

    return {
      id: String(data.id),

      name:
        data.name ??
        data.login,

      username:
        data.login,

      email,

      avatarUrl:
        data.avatar_url,
    };
  }

  async createIssue({
    accessToken,
    owner,
    repo,
    title,
    body = "",
  }) {
    if (!accessToken) {
      throw new Error(
        "GITHUB_ACCESS_TOKEN_REQUIRED",
      );
    }

    if (
      !owner ||
      !String(owner).trim()
    ) {
      throw new Error(
        "GITHUB_REPOSITORY_OWNER_REQUIRED",
      );
    }

    if (
      !repo ||
      !String(repo).trim()
    ) {
      throw new Error(
        "GITHUB_REPOSITORY_REQUIRED",
      );
    }

    if (
      !title ||
      !String(title).trim()
    ) {
      throw new Error(
        "GITHUB_ISSUE_TITLE_REQUIRED",
      );
    }

    const normalizedOwner =
      String(owner).trim();

    const normalizedRepo =
      String(repo).trim();

    const { data } =
      await axios.post(
        `https://api.github.com/repos/${encodeURIComponent(
          normalizedOwner,
        )}/${encodeURIComponent(
          normalizedRepo,
        )}/issues`,

        {
          title:
            String(title).trim(),

          body:
            String(body ?? ""),
        },

        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/vnd.github+json",

            "X-GitHub-Api-Version":
              "2022-11-28",
          },
        },
      );

    return {
      provider: "github",

      actionName:
        "create_issue",

      issueNumber:
        data.number,

      issueId:
        data.id,

      issueUrl:
        data.html_url,
    };
  }

  async addComment({
    accessToken,
    owner,
    repo,
    issueNumber,
    body,
  }) {
    if (!accessToken) {
      throw new Error(
        "GITHUB_ACCESS_TOKEN_REQUIRED",
      );
    }

    if (
      !owner ||
      !String(owner).trim()
    ) {
      throw new Error(
        "GITHUB_REPOSITORY_OWNER_REQUIRED",
      );
    }

    if (
      !repo ||
      !String(repo).trim()
    ) {
      throw new Error(
        "GITHUB_REPOSITORY_REQUIRED",
      );
    }

    const parsedIssueNumber =
      Number(issueNumber);

    if (
      !Number.isInteger(
        parsedIssueNumber,
      ) ||
      parsedIssueNumber <= 0
    ) {
      throw new Error(
        "GITHUB_ISSUE_NUMBER_REQUIRED",
      );
    }

    if (
      !body ||
      !String(body).trim()
    ) {
      throw new Error(
        "GITHUB_COMMENT_BODY_REQUIRED",
      );
    }

    const normalizedOwner =
      String(owner).trim();

    const normalizedRepo =
      String(repo).trim();

    const { data } =
      await axios.post(
        `https://api.github.com/repos/${encodeURIComponent(
          normalizedOwner,
        )}/${encodeURIComponent(
          normalizedRepo,
        )}/issues/${parsedIssueNumber}/comments`,

        {
          body:
            String(body).trim(),
        },

        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/vnd.github+json",

            "X-GitHub-Api-Version":
              "2022-11-28",
          },
        },
      );

    return {
      provider: "github",

      actionName:
        "add_comment",

      commentId:
        data.id,

      commentUrl:
        data.html_url,

      issueNumber:
        parsedIssueNumber,
    };
  }

  async revokeAccess() {
    // Las GitHub OAuth Apps no permiten
    // revocar únicamente con el access token.
    // BitCraft elimina la conexión localmente.

    return true;
  }
}

module.exports = GitHubAdapter;