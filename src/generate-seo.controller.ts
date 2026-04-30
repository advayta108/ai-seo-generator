import { Body, Controller, HttpException, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  BadInputError,
  EmptyLlmResponseError,
  FlowiseTimeoutError,
  FlowiseUpstreamError,
  InvalidJsonError,
} from './errors';
import { GenerateSeoService } from './generate-seo.service';
import { SeoStreamEvent } from './seo.types';

@Controller('api')
export class GenerateSeoController {
  public constructor(private readonly generateSeoService: GenerateSeoService) {}

  @Post('generate-seo')
  public async generateSeo(@Body() body: unknown, @Res() response: Response): Promise<void> {
    const request = this.normalizeOrThrow(body);

    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    try {
      for await (const event of this.generateSeoService.streamSeo(request)) {
        await writeSse(response, event);
      }

      response.end();
    } catch (error) {
      await writeSse(response, toErrorEvent(error));
      response.end();
    }
  }

  private normalizeOrThrow(body: unknown) {
    try {
      return this.generateSeoService.normalizeRequest(body);
    } catch (error) {
      if (error instanceof BadInputError) {
        throw new HttpException(
          { code: error.code, message: error.message },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw error;
    }
  }
}

async function writeSse(response: Response, event: SeoStreamEvent): Promise<void> {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

  if (response.write(payload)) {
    return;
  }

  await new Promise<void>((resolve) => {
    response.once('drain', resolve);
  });
}

function toErrorEvent(error: unknown): SeoStreamEvent {
  if (
    error instanceof FlowiseTimeoutError ||
    error instanceof EmptyLlmResponseError ||
    error instanceof InvalidJsonError ||
    error instanceof FlowiseUpstreamError ||
    error instanceof BadInputError
  ) {
    return {
      type: 'error',
      data: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    type: 'error',
    data: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected SEO generation error.',
    },
  };
}
