import { Module } from '@nestjs/common';
import { MoviesModule } from '../movies/movies.module';
import { WebController } from './web.controller';
import { WebService } from './web.service';

@Module({
  imports: [MoviesModule],
  controllers: [WebController],
  providers: [WebService],
})
export class WebModule {}
