import { randomUUID } from 'crypto';

const EDGE_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readahead/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

export async function synthesize(text, voice = 'en-US-ChristopherNeural') {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(EDGE_URL, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold'
      }
    });

    const audioChunks = [];
    const requestId = randomUUID().replace(/-/g, '');

    ws.onopen = () => {
      // 1. Send speech.config
      const configMsg = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'true' },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
              }
            }
          }
        });
      ws.send(configMsg);

      // 2. Send SSML
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'>${text}</voice></speak>`;
      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` + ssml;
      ws.send(ssmlMsg);
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) {
          ws.close();
          resolve(Buffer.concat(audioChunks));
        }
      } else {
        const buffer = Buffer.from(await event.data.arrayBuffer());
        const headerLen = buffer.readUInt16BE(0);
        const header = buffer.subarray(2, 2 + headerLen).toString();
        if (header.includes('Path:audio')) {
          const audioData = buffer.subarray(2 + headerLen);
          audioChunks.push(audioData);
        }
      }
    };

    ws.onerror = (err) => {
      reject(err);
    };

    setTimeout(() => {
      ws.close();
      if (audioChunks.length > 0) resolve(Buffer.concat(audioChunks));
      else reject(new Error('TTS timeout'));
    }, 10000);
  });
}

synthesize('Hello from Cinebox storytelling audio!', 'en-US-ChristopherNeural')
  .then((audio) => {
    console.log('SUCCESS! Received audio bytes:', audio.length);
    process.exit(0);
  })
  .catch((err) => {
    console.error('TTS error:', err);
    process.exit(1);
  });

