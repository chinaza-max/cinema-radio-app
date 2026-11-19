import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Collection `genres`. One document per genre row on the home page. */
@Schema({ collection: 'genres' })
export class Genre {
  /** URL-safe key, unique. "Science fiction" becomes "science-fiction". */
  @Prop({ required: true, unique: true })
  slug: string;

  /** Display name, taken from the first movie that used it. */
  @Prop({ required: true })
  name: string;

  /** Lower comes first on the home page. Ties are broken alphabetically by name. */
  @Prop({ default: 0 })
  sortOrder: number;
}

export type GenreDocument = HydratedDocument<Genre>;
export const GenreSchema = SchemaFactory.createForClass(Genre);
