const { google } = require("googleapis");
const ProviderAdapter = require("./ProviderAdapter");

class GoogleAdapter extends ProviderAdapter {
  constructor({
    clientId,
    clientSecret,
    redirectUri,
  }) {
    super();

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    this.scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.send",
    ];
  }

  getAuthorizationUrl(state) {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: this.scopes,
      state,
    });
  }

  async exchangeCode(code) {
    const { tokens } =
      await this.oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,

      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,

      scopes:
        tokens.scope ?? this.scopes.join(" "),
    };
  }

  async getAccountProfile(accessToken) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const oauth2 = google.oauth2({
      version: "v2",
      auth: this.oauth2Client,
    });

    const { data } = await oauth2.userinfo.get();

    return {
      providerAccountId: data.id,
      accountName: data.name ?? null,
      accountEmail: data.email ?? null,
    };
  }

  async revokeAccess(accessToken) {
    await this.oauth2Client.revokeToken(
      accessToken,
    );

    return true;
  }
}

module.exports = GoogleAdapter;