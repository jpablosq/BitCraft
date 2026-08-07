const { google } = require("googleapis");

const ProviderAdapter = require(
  "./ProviderAdapter",
);

const {
  normalizeProviderError,
} = require("./provider-error");


class GoogleAdapter extends ProviderAdapter {
  constructor({
    clientId,
    clientSecret,
    redirectUri,
  }) {
    super();

    this.oauth2Client =
      new google.auth.OAuth2(
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
      await this.oauth2Client.getToken(
        code,
      );

    return {
      accessToken:
        tokens.access_token,

      refreshToken:
        tokens.refresh_token ?? null,

      expiresAt:
        tokens.expiry_date
          ? new Date(
              tokens.expiry_date,
            )
          : null,

      scopes:
        tokens.scope ??
        this.scopes.join(" "),
    };
  }


  async getAccountProfile(
    accessToken,
  ) {
    this.oauth2Client.setCredentials({
      access_token:
        accessToken,
    });

    const oauth2 =
      google.oauth2({
        version: "v2",
        auth: this.oauth2Client,
      });

    const { data } =
      await oauth2.userinfo.get();

    return {
      providerAccountId:
        data.id,

      accountName:
        data.name ?? null,

      accountEmail:
        data.email ?? null,
    };
  }


  async sendEmail({
    accessToken,
    refreshToken = null,
    to,
    subject,
    body,
  }) {
    if (!accessToken) {
      throw new Error(
        "GOOGLE_ACCESS_TOKEN_REQUIRED",
      );
    }

    if (
      !to ||
      !String(to).trim()
    ) {
      throw new Error(
        "EMAIL_RECIPIENT_REQUIRED",
      );
    }

    if (
      !subject ||
      !String(subject).trim()
    ) {
      throw new Error(
        "EMAIL_SUBJECT_REQUIRED",
      );
    }

    this.oauth2Client.setCredentials({
      access_token:
        accessToken,

      refresh_token:
        refreshToken,
    });

    const gmail =
      google.gmail({
        version: "v1",
        auth: this.oauth2Client,
      });

    const safeTo =
      String(to)
        .replace(
          /[\r\n]/g,
          "",
        )
        .trim();

    const safeSubject =
      String(subject)
        .replace(
          /[\r\n]/g,
          " ",
        )
        .trim();

    const encodedSubject =
      Buffer
        .from(
          safeSubject,
          "utf8",
        )
        .toString(
          "base64",
        );

    const message = [
      `To: ${safeTo}`,
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      String(
        body ?? "",
      ),
    ].join("\r\n");

    const raw =
      Buffer
        .from(
          message,
          "utf8",
        )
        .toString(
          "base64url",
        );

    try {
      const { data } =
        await gmail.users.messages.send({
          userId: "me",

          requestBody: {
            raw,
          },
        });

      return {
        provider:
          "google",

        actionName:
          "send_email",

        messageId:
          data.id,

        threadId:
          data.threadId ?? null,
      };
    } catch (error) {
      throw normalizeProviderError(
        "google",
        error,
      );
    }
  }


  async revokeAccess(
    accessToken,
  ) {
    await this.oauth2Client.revokeToken(
      accessToken,
    );

    return true;
  }
}


module.exports = GoogleAdapter;