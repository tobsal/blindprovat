export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

export const NOTE_MAX = 500;
export const GUESS_MAX = 100;

export const RATING_TAGS = [
  "fruity",
  "spicy",
  "oaky",
  "acidic",
  "mineral",
  "floral",
  "tannic",
  "sweet",
] as const;

export type RatingTag = (typeof RATING_TAGS)[number];

export const MAX_TAGS = 5;
