import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from './admin/admin.module';
import { AudioModule } from './audio/audio.module';
import { GenresModule } from './genres/genres.module';
import { MoviesModule } from './movies/movies.module';
import { SeedModule } from './seed/seed.module';
import { WebModule } from './web/web.module';

/**
 * Database: MongoDB through Mongoose. Set MONGODB_URI (see .env.example).
 *   local   mongodb://127.0.0.1:27017/cinebox        (run `docker compose up -d` for one)
 *   Atlas   mongodb+srv://user:password@cluster.xxxx.mongodb.net/cinebox
 * Collections and indexes are created automatically on first use.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://127.0.0.1:27017/cinebox'),
        retryAttempts: process.env.VERCEL ? 0 : 9, // serverless must fail fast, not retry past the function time limit
        serverSelectionTimeoutMS: 8000, // fail fast with a clear error when MongoDB is not reachable
      }),
    }),
    GenresModule,
    MoviesModule,
    AdminModule,
    AudioModule,
    WebModule,
    SeedModule,
  ],
})
export class AppModule {}
