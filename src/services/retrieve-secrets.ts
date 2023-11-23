import BrokerIntention from './broker.service';
import { VaultService } from './vault.service';

export async function getObjectStorageSecrets(
  brokerJWT: string,
): Promise<string> {
  const intention = new BrokerIntention('./src/services/intention.json');
  await intention.open(brokerJWT);
  await intention.startAction(intention.getActionId(0));
  const vaultAccessToken = await intention.provisionToken(
    intention.getActionId(0),
  );
  //console.log(vaultAccessToken);
  const vault = new VaultService(vaultAccessToken);
  const objectStorageCreds = vault.read(`apps/data/prod/vault/vsync`);
  const secrets = await objectStorageCreds;
  const secret_key = secrets.secret_key;
  const reNum = vault.revokeToken();
  console.log('revoke token: ' + (await reNum).toString());
  intention.endAction('login');
  intention.close(true);
  return secret_key;
}
