export interface Book {
  id?: number;
  title: string;
  author: string;
  isbn?: string;
  isbn13?: string;
  pub_date?: string;
  num_pages?: number;
  genre?: string;
  cover_image_url?: string;
  spine_image_path?: string;
  dimensions?: string;
  dom_color?: string;
  series?: string;
  series_position?: string;
  notes?: string;
  why_reading?: string;
  date_added?: string;
  date_started?: string;
  date_finished?: string;
  reading_state?: 'want_to_read' | 'currently_reading' | 'read';
  rank_position?: number;
  initial_stars?: number;
  tags?: Tag[];
  continues_from?: Book[];
  continues_to?: Book[];
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  book_count?: number;
}

export interface Ranking {
  id: number;
  book_id: number;
  rank_position: number;
  initial_stars?: number;
  total_ranked?: number;
  derived_rating?: {
    score: number;
    stars: number;
    position: number;
    total: number;
  };
}

export interface Comparison {
  id: number;
  book_a_id: number;
  book_b_id: number;
  winner_id: number;
  book_a_title?: string;
  book_b_title?: string;
  winner_title?: string;
  created_at: string;
}

export interface Goal {
  id: number;
  year: number;
  target_count: number;
  period: 'year' | 'month' | 'week';
  completed?: number;
  time_progress?: number;
}

export interface Continuation {
  id: number;
  from_book_id: number;
  to_book_id: number;
  from_title?: string;
  from_author?: string;
  to_title?: string;
  to_author?: string;
  created_at: string;
}

export interface ContinuationGraph {
  nodes: {
    id: number;
    title: string;
    author: string;
  }[];
  edges: {
    from: number;
    to: number;
    created_at: string;
  }[];
}

export interface RankingWizard {
  book_id: number;
  initial_stars: number;
  comparisons: {
    candidate_book_id: number;
    candidate_title: string;
    candidate_author: string;
    candidate_position: number;
  }[];
  total_ranked: number;
}

