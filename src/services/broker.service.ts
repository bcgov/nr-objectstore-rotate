import * as fs from 'fs';
import { VaultService } from './vault.service';
import { isResponseSuccess, sendHttpsRequest } from './http-util';
import { BROKER_URL, VAULT_URL } from '../constants';

export class BrokerService {
  intention: any;
  openResponse?: any;
  //broker_env: string = '';
  private HEADER_BROKER_TOKEN = 'X-Broker-Token';

  constructor(path: string) {
    try {
      const json = JSON.parse(fs.readFileSync(path, 'utf8'));
      this.intention = json;
    } catch (error) {
      console.error('Error reading or parsing JSON file:', error);
    }
  }

  getOpenResponse(): string {
    return this.openResponse;
  }

  setOpenResponse(response: any): void {
    this.openResponse = response;
  }

  getUserName(): string {
    return this.intention.user.name;
  }

  setUserName(user: string): void {
    this.intention.user.name = user;
  }

  getEventUrl(): string {
    return this.intention.event.url;
  }

  setEventUrl(url: string): void {
    this.intention.event.url = url;
  }

  getEventProvider(): string {
    return this.intention.event.provider;
  }

  setEventProvider(provider: string): void {
    this.intention.event.provider = provider;
  }

  getActionId(pos: number): string {
    return this.intention.actions[pos].id;
  }

  getEnvironment(): string {
    return this.intention.actions[0].service.environment;
  }
  /*
  setEnvironment(environment: string): void {
    this.intention.actions[0].service.environment = environment;
  }
*/
  public async health(authToken: string): Promise<boolean> {
    if (!authToken) {
      throw new Error('Missing authentication token');
    }

    const url = `${BROKER_URL}health`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const response = await sendHttpsRequest(url, 'GET', headers);

    if (isResponseSuccess(response.statusCode)) {
      this.openResponse = JSON.parse(response.body);
      console.log(this.openResponse);
      return true;
    } else {
      throw new Error(response.body);
    }
  }

  public async open(authToken: string, ttl?: number): Promise<boolean> {
    if (!authToken) {
      throw new Error('Missing authentication token');
    }

    const params = ttl ? `?ttl=${ttl}` : '';
    const url = `${BROKER_URL}intention/open${params}`;
    const message = this.intention;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const response = await sendHttpsRequest(url, 'POST', headers, message);

    if (isResponseSuccess(response.statusCode)) {
      this.openResponse = JSON.parse(response.body);
      return true;
    } else {
      throw new Error(response.body);
    }
  }

  public async startAction(action: string): Promise<void> {
    if (!action) {
      throw new Error('Invalid action id');
    }
    if (!this.openResponse) {
      throw new Error('Intention was never opened');
    }
    await this.actionLifecycleLog(
      this.openResponse.actions[action].token,
      'start',
    );
  }

  public async endAction(action: string): Promise<void> {
    if (!action) {
      throw new Error('Invalid action id');
    }
    if (!this.openResponse) {
      throw new Error('Intention was never opened');
    }
    await this.actionLifecycleLog(
      this.openResponse.actions[action].token,
      'end',
    );
  }

  private async actionLifecycleLog(
    token: string,
    type: string,
  ): Promise<boolean> {
    const url = `${BROKER_URL}intention/action/${type}`;
    const headers = {
      'Content-Type': 'application/json',
      [this.HEADER_BROKER_TOKEN]: token,
    };
    const response = await sendHttpsRequest(url, 'POST', headers);

    return isResponseSuccess(response.statusCode);
  }

  public async close(successArg: boolean): Promise<string> {
    if (!this.openResponse) {
      throw new Error('Intention was never opened');
    }

    const outcome = successArg ? 'success' : 'failure';
    const url = `${BROKER_URL}intention/close?outcome=${outcome}`;
    const headers = {
      'Content-Type': 'application/json',
      [this.HEADER_BROKER_TOKEN]: this.openResponse.token,
    };

    const response = await sendHttpsRequest(url, 'POST', headers);

    const resp = JSON.parse(response.body);
    return resp.audit;
  }

  public async provisionSecretId(
    action: string,
    roleId: string | null = null,
  ): Promise<string> {
    if (!action) {
      throw new Error('Invalid action id');
    }
    if (!this.openResponse) {
      throw new Error('Intention was never opened');
    }

    const actionToken = this.openResponse.actions[action].token;
    if (!actionToken) {
      throw new Error('Invalid action token');
    }

    const url = `${BROKER_URL}provision/approle/secret-id`;
    const headers: any = {
      'Content-Type': 'application/json',
      [this.HEADER_BROKER_TOKEN]: actionToken,
    };

    if (roleId) {
      headers['X-Vault-Role-Id'] = roleId;
    }

    const response = await sendHttpsRequest(url, 'POST', headers);

    if (isResponseSuccess(response.statusCode)) {
      const wrappedTokenResponse = JSON.parse(response.body);
      const vault = new VaultService(wrappedTokenResponse.wrap_info.token);
      const unwrappedToken = await vault.unwrapToken(
        wrappedTokenResponse.wrap_info.token,
      );
      if (unwrappedToken !== undefined) {
        const secretId = unwrappedToken.data.secret_id;
        const login_url = `${VAULT_URL}auth/vs_apps_approle/login`;
        const headers: any = {
          'Content-Type': 'application/json',
        };
        const body: any = {
          role_id: roleId,
          secret_id: secretId,
        };
        const req = await sendHttpsRequest(login_url, 'POST', headers, body);

        if (isResponseSuccess(req.statusCode)) {
          const tokenResponse = JSON.parse(req.body);
          return tokenResponse.auth.client_token;
        } else throw new Error(req.body);
      } else throw new Error(response.body);
    } else {
      throw new Error(response.body);
    }
  }

  public async provisionToken(
    action: string,
    roleId: string | null = null,
    unwrapToken = true,
  ): Promise<string> {
    if (!action) {
      throw new Error('Invalid action id');
    }
    if (!this.openResponse) {
      throw new Error('Intention was never opened');
    }

    const actionToken = this.openResponse?.actions[action].token;
    if (!actionToken) {
      throw new Error('Invalid action token');
    }

    const url = `${BROKER_URL}provision/token/self`;
    const headers: any = {
      'Content-Type': 'application/json',
      [this.HEADER_BROKER_TOKEN]: actionToken,
    };

    if (roleId) {
      headers['X-Vault-Role-Id'] = roleId;
    }

    const response = await sendHttpsRequest(url, 'POST', headers);

    if (isResponseSuccess(response.statusCode)) {
      const wrappedTokenResponse = JSON.parse(response.body);
      if (!unwrapToken) {
        return wrappedTokenResponse.wrap_info.token;
      }
      const vault = new VaultService(wrappedTokenResponse.wrap_info.token);
      const unwrappedToken = await vault.unwrapToken(
        wrappedTokenResponse.wrap_info.token,
      );

      if (unwrappedToken !== undefined) return unwrappedToken.auth.client_token;
      else throw new Error(response.body);
    } else {
      throw new Error(response.body);
    }
  }
}

export default BrokerService;
