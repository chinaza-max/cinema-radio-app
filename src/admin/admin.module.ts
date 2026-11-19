import { Module } from '@nestjs/common';
import { MoviesModule } from '../movies/movies.module';
import { AdminController } from './admin.controller';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [MoviesModule],
  controllers: [AdminController],
  providers: [ApiKeyGuard],
})
export class AdminModule {}
