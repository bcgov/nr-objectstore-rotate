// import { getClient } from '../minio';

export async function backup() {
  console.log('backup: start');
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const client = getClient();
  } catch (e) {
    console.log('Backup: Could not create client');
  }
}
