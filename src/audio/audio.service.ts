import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';
import { PUBLIC_DIR, ROOT_DIR } from '../config/paths';

export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female';
  description: string;
}

export const VOICES: VoiceInfo[] = [
  { id: 'en-US-ChristopherNeural', name: 'Christopher', lang: 'en-US', gender: 'male', description: 'Deep, warm storytelling voice' },
  { id: 'en-US-GuyNeural', name: 'Guy', lang: 'en-US', gender: 'male', description: 'Conversational, classic American narrator' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', lang: 'en-GB', gender: 'male', description: 'Expressive British narrator' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', lang: 'en-GB', gender: 'female', description: 'Gentle, melodic British female voice' },
  { id: 'en-NG-AbeoNeural', name: 'Abeo', lang: 'en-NG', gender: 'male', description: 'Lively Nigerian English voice' },
  { id: 'en-NG-EzinneNeural', name: 'Ezinne', lang: 'en-NG', gender: 'female', description: 'Expressive Nigerian female voice' },
  { id: 'en-US-JennyNeural', name: 'Jenny', lang: 'en-US', gender: 'female', description: 'Clear, modern female voice' },
];

export const DEFAULT_VOICE = 'en-US-ChristopherNeural';

@Injectable()
export class AudioService {
  private readonly log = new Logger(AudioService.name);
  // Vercel's filesystem is read-only except /tmp.
  private readonly cacheDir = process.env.VERCEL ? join(tmpdir(), 'cinebox-audio') : join(PUBLIC_DIR, 'audio', 'cache');
  private readonly scriptPath = join(ROOT_DIR, 'scripts', 'generate-voice.py');

  constructor() {
    try {
      if (!existsSync(this.cacheDir)) mkdirSync(this.cacheDir, { recursive: true });
    } catch (err: any) {
      this.log.warn(`Audio cache directory unavailable: ${err.message}`); // never stop the app for this
    }
  }

  getVoices(): VoiceInfo[] {
    return VOICES;
  }

  /**
   * Retrieves or synthesizes the MP3 audio file for the given text.
   * Returns the absolute path to the cached MP3 file.
   */
  async getAudioFile(text: string, voice = DEFAULT_VOICE, rate = '+0%', pitch = '+0Hz'): Promise<string> {
    const safeText = text.trim();
    const safeVoice = VOICES.some((v) => v.id === voice) ? voice : DEFAULT_VOICE;

    const hash = createHash('sha1').update(`${safeText}:${safeVoice}:${rate}:${pitch}`).digest('hex');
    const bundled = join(PUBLIC_DIR, 'audio', 'cache', `${hash}.mp3`); // ships with the repo
    if (existsSync(bundled)) return bundled;
    const filePath = join(this.cacheDir, `${hash}.mp3`);

    if (existsSync(filePath)) {
      return filePath;
    }

    try {
      await this.generateWithPython(safeText, safeVoice, filePath, rate, pitch);
      return filePath;
    } catch (err: any) {
      this.log.warn(`Edge TTS generation failed, falling back to Google TTS: ${err.message}`);
      await this.generateWithGoogleFallback(safeText, filePath);
      return filePath;
    }
  }

  private generateWithPython(text: string, voice: string, outPath: string, rate: string, pitch: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python3', [this.scriptPath, text, voice, outPath, rate, pitch]);
      let stderr = '';

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && existsSync(outPath)) {
          resolve();
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async generateWithGoogleFallback(text: string, outPath: string): Promise<void> {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buf);
  }
}

