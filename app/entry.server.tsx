import { PassThrough } from 'stream';
import type { EntryContext } from '@remix-run/node';
import { Response } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import isbot from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { createStylesServer } from '@mantine/remix';

const ABORT_DELAY = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let callbackMethod = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady';

  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
      [callbackMethod]() {
        const body = new PassThrough();
        const server = createStylesServer();
        const bodyWithStyles = server.renderStylesToNodeStream();
        body.pipe(bodyWithStyles);

        resolve(
          new Response(bodyWithStyles, {
            headers: responseHeaders,
            status: didError ? 500 : responseStatusCode,
          })
        );

        pipe(body);
      },
      onShellError(err: unknown) {
        reject(err);
      },
      onError(error: unknown) {
        didError = true;

        console.error(error);
      },
    });

    setTimeout(abort, ABORT_DELAY);
  });
}
