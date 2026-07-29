class ProviderAdapter {
  getAuthorizationUrl() {
    throw new Error(
      "getAuthorizationUrl debe implementarse en el adaptador",
    );
  }

  async exchangeCode(code) {
    throw new Error(
      "exchangeCode debe implementarse en el adaptador",
    );
  }

  async getAccountProfile(accessToken) {
    throw new Error(
      "getAccountProfile debe implementarse en el adaptador",
    );
  }

  async revokeAccess(accessToken) {
    throw new Error(
      "revokeAccess debe implementarse en el adaptador",
    );
  }
}

module.exports = ProviderAdapter;