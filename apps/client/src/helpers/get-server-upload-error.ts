// the server answers a failed upload in json; anything else came from something in front of it
// (a proxy, a tunnel such as cloudflare), and over http/2 there is no status text to fall back on
export const getServerUploadError = (responseText: string) => {
  try {
    const data = JSON.parse(responseText);

    if (typeof data?.error === 'string' && data.error) {
      return data.error as string;
    }
  } catch {
    // not json, so not from the server
  }

  return undefined;
};
