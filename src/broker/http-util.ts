import * as https from 'https';

export function isResponseSuccess(code: number): boolean {
  return code >= 200 && code <= 299;
}

export function sendHttpsRequest(
  url: string,
  method: string,
  headers: any,
  body?: string,
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const options: https.RequestOptions = {
      method,
      headers,
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk: any) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}
