const { AuthorizationCode } = require("simple-oauth2");
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
        authorizePath: "/login/oauth/authorize",
        tokenPath: "/login/oauth/access_token",
      },
    });

    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state) {
    return this.client.authorizeURL({
      redirect_uri: this.redirectUri,
      scope: "read:user user:email repo",
      state,
    });
  }

  async exchangeCodeForTokens(code) {
    const token = await this.client.getToken(
      {
        code,
        redirect_uri: this.redirectUri,
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    const accessToken = token.token.access_token;

    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scopes:
        token.token.scope ?? "read:user user:email repo",
    };
  }

  async getAuthenticatedUser(accessToken) {
    const { data } = await axios.get(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept:
            "application/vnd.github+json",
        },
      },
    );

    let email = null;

    try {
      const response = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept:
              "application/vnd.github+json",
          },
        },
      );

      const primaryEmail =
        response.data.find(
          (email) => email.primary,
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

  async revokeAccess() {
    // GitHub OAuth Apps no permiten
    // revocar un token solamente con el access token.
    // BitCraft elimina la conexión localmente.

    return true;
  }
}

module.exports = GitHubAdapter;