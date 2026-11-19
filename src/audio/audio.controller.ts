import { Controller, Get, Header, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { AudioService } from './audio.service';

@Controller('api/audio')
export class AudioController {
  constructor(private readonly audio: AudioService) {}

  @Get('voices')
  @Header('Cache-Control', 'public, max-age=3600')
  voices() {
    return this.audio.getVoices();
  }

  @Get('speak')
  async speak(
    @Query('text') text: string,
    @Query('voice') voice: string | undefined,
    @Query('rate') rate: string | undefined,
    @Query('pitch') pitch: string | undefined,
    @Res() res: Response,
  ) {
    if (!text || !text.trim()) {
      throw new BadRequestException('text query parameter is required');
    }

    const filePath = await this.audio.getAudioFile(text, voice, rate, pitch);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  }
}

