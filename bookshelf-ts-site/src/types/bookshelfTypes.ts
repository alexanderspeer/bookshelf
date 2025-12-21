import { book } from "../types/interfaces";

export interface BookPosition {
  book: book;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractiveBookshelfData {
  imageDataUrl: string;
  bookPositions: BookPosition[];
}

