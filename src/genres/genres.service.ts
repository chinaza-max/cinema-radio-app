import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { slugify } from '../common/slugify';
import { Genre } from './genre.schema';

export interface GenreRef {
  slug: string;
  name: string;
  sortOrder: number;
}

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name) private readonly genres: Model<Genre>) {}

  list(): Promise<GenreRef[]> {
    return this.genres.find({}, { slug: 1, name: 1, sortOrder: 1, _id: 0 }).sort({ sortOrder: 1, name: 1 }).lean<GenreRef[]>();
  }

  /**
   * Find the genre by name (matched through its slug, so case-insensitive) or create it.
   * One atomic upsert, so two imports creating the same new genre at once cannot duplicate it.
   */
  async ensure(name: string): Promise<GenreRef> {
    const slug = slugify(name);
    const create = () =>
      this.genres
        .findOneAndUpdate(
          { slug },
          { $setOnInsert: { name: name.trim(), sortOrder: 0 } },
          { upsert: true, returnDocument: 'after', projection: { slug: 1, name: 1, sortOrder: 1, _id: 0 } },
        )
        .lean<GenreRef>();
    try {
      return (await create())!;
    } catch (err: any) {
      if (err?.code === 11000) return (await create())!; // lost a race on the unique index: the row exists now
      throw err;
    }
  }
}
