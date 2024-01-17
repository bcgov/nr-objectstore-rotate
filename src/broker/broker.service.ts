import { VaultService } from './vault.service';
import { isResponseSuccess, sendHttpsRequest } from './http-util';
import { BROKER_URL } from '../constants';

const HEADER_BROKER_TOKEN = 'X-Broker-Token';

export class ArtifactDto {
  checksum?: string;
  name!: string;
  size?: number;
  type?: string;
}

export class BrokerService {
  private openResponse: any;
  constructor(private brokerJwt: any) {}

  public async open(intention: any, ttl?: number): Promise<any> {
    if (!this.brokerJwt) {
      throw new Error('Missing authentication token');
    }

    const params = ttl ? `?ttl=${ttl}&quickstart=true` : '?quickstart=true';
    const url = `${BROKER_URL}v1/intention/open${params}`;
    const message = intention;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.brokerJwt}`,
    };

    const response = await sendHttpsRequest(url, 'POST', headers, message);

    if (isResponseSuccess(response.statusCode)) {
      this.openResponse = JSON.parse(response.body);
      return this.openResponse;
    } else {
      throw new Error(response.body);
    }
  }

  public async close(successArg: boolean): Promise<string> {
    if (!this.openResponse) {
      throw new Error('Intention was never opened');
    }

    const outcome = successArg ? 'success' : 'failure';
    const url = `${BROKER_URL}v1/intention/close?outcome=${outcome}`;
    const headers = {
      'Content-Type': 'application/json',
      [HEADER_BROKER_TOKEN]: this.openResponse.token,
    };

    const response = await sendHttpsRequest(url, 'POST', headers);

    const resp = JSON.parse(response.body);
    return resp.audit;
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

    const url = `${BROKER_URL}v1/provision/token/self`;
    const headers: any = {
      'Content-Type': 'application/json',
      [HEADER_BROKER_TOKEN]: actionToken,
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
      const unwrappedToken = await VaultService.unwrapToken(
        wrappedTokenResponse.wrap_info.token,
      );

      if (unwrappedToken !== undefined) return unwrappedToken.auth.client_token;
      else throw new Error(response.body);
    } else {
      throw new Error(response.body);
    }
  }

  public async attachArtifact(action: string, file: ArtifactDto) {
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

    const url = `${BROKER_URL}v1/intention/action/artifact`;
    const headers: any = {
      'Content-Type': 'application/json',
      [HEADER_BROKER_TOKEN]: actionToken,
    };

    return await sendHttpsRequest(url, 'POST', headers, JSON.stringify(file));
  }
}

export default BrokerService;
