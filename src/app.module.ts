import { Module } from '@nestjs/common';
import { GenerateSeoController } from './generate-seo.controller';
import { GenerateSeoService } from './generate-seo.service';

@Module({
  controllers: [GenerateSeoController],
  providers: [GenerateSeoService],
})
export class AppModule {}
