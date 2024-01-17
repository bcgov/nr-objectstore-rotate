import { isResponseSuccess, sendHttpsRequest } from './http-util';
import { VAULT_URL } from '../constants';

export class VaultService {
  token: string;
  private HEADER_VAULT_TOKEN = 'X-Vault-Token';

  constructor(token: string) {
    this.token = token;
  }

  async unwrapToken(token: string): Promise<any | undefined> {
    const url = `${VAULT_URL}/sys/wrapping/unwrap`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Vault-Token': token,
    };
    const response = await sendHttpsRequest(url, 'POST', headers);
    if (isResponseSuccess(response.statusCode)) {
      const unwrappedTokenResponse = JSON.parse(response.body);
      return unwrappedTokenResponse;
    } else throw new Error(response.body);
  }

  async read(path: string): Promise<any> {
    const url = `${VAULT_URL}/${path}`;
    const headers = {
      'Content-Type': 'application/json',
      [this.HEADER_VAULT_TOKEN]: this.token,
    };

    const response = await sendHttpsRequest(url, 'GET', headers);

    if (!response) {
      return undefined;
    }
    if (isResponseSuccess(response.statusCode)) {
      const resp = JSON.parse(response.body);
      return resp.data.data;
    } else {
      throw new Error(response.body);
    }
  }

  async revokeToken(): Promise<number> {
    const url = `${VAULT_URL}/auth/token/revoke-self`;
    const headers = {
      'Content-Type': 'application/json',
      [this.HEADER_VAULT_TOKEN]: this.token,
    };
    const req = await sendHttpsRequest(url, 'POST', headers);
    if (!req) return 0;
    else return req.statusCode || 0;
  }
}

export default VaultService;
