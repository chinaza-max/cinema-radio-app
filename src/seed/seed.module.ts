import { Module } from '@nestjs/common';
import { MoviesModule } from '../movies/movies.module';
import { SeedService } from './seed.service';

@Module({
  imports: [MoviesModule],
  providers: [SeedService],
})
export class SeedModule {}
