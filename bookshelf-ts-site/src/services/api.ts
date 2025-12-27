// Use relative path when deployed together, absolute for local development
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api'
);

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Books
  async searchBooksMetadata(query: string, author?: string) {
    const params = new URLSearchParams({ q: query });
    if (author) params.append('author', author);
    return this.request(`/books/search?${params}`);
  }

  async createBook(bookData: any, initialState = 'want_to_read') {
    return this.request('/books', {
      method: 'POST',
      body: JSON.stringify({ ...bookData, initial_state: initialState }),
    });
  }

  async getBook(bookId: number) {
    return this.request(`/books/${bookId}`);
  }

  async updateBook(bookId: number, bookData: any) {
    return this.request(`/books/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(bookData),
    });
  }

  async deleteBook(bookId: number) {
    return this.request(`/books/${bookId}`, {
      method: 'DELETE',
    });
  }

  async listBooks(params: {
    q?: string;
    author?: string;
    tag?: string;
    state?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return this.request(`/books?${searchParams}`);
  }

  async getShelf(state: string, limit = 50, offset = 0) {
    return this.request(`/books/shelf/${state}?limit=${limit}&offset=${offset}`);
  }

  async setReadingState(bookId: number, state: string, dates: any = {}) {
    return this.request(`/books/${bookId}/state`, {
      method: 'PUT',
      body: JSON.stringify({ state, ...dates }),
    });
  }

  async uploadSpineImage(bookId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return fetch(`${this.baseUrl}/books/${bookId}/spine`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  }

  // Rankings
  async getRankings() {
    return this.request('/rankings');
  }

  async startRankingWizard(bookId: number, initialStars: number) {
    return this.request('/rankings/wizard/start', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, initial_stars: initialStars }),
    });
  }

  async finalizeRanking(bookId: number, finalPosition: number, initialStars: number, comparisons: any[]) {
    return this.request('/rankings/wizard/finalize', {
      method: 'POST',
      body: JSON.stringify({
        book_id: bookId,
        final_position: finalPosition,
        initial_stars: initialStars,
        comparisons,
      }),
    });
  }

  async getBookRanking(bookId: number) {
    return this.request(`/rankings/${bookId}`);
  }

  async updateRanking(bookId: number, position: number) {
    return this.request(`/rankings/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify({ position }),
    });
  }

  async getComparisons(bookId: number) {
    return this.request(`/rankings/${bookId}/comparisons`);
  }

  // Tags
  async getTags() {
    return this.request('/tags');
  }

  async getTagStats() {
    return this.request('/tags/stats');
  }

  async createTag(name: string, color?: string) {
    return this.request('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  }

  async updateTag(tagId: number, name?: string, color?: string) {
    return this.request(`/tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });
  }

  async deleteTag(tagId: number) {
    return this.request(`/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  async mergeTags(sourceId: number, targetId: number) {
    return this.request('/tags/merge', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    });
  }

  async addTagToBook(bookId: number, tagId: number) {
    return this.request(`/books/${bookId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_id: tagId }),
    });
  }

  async removeTagFromBook(bookId: number, tagId: number) {
    return this.request(`/books/${bookId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  // Goals
  async getGoals() {
    return this.request('/goals');
  }

  async getCurrentGoal() {
    const url = `${this.baseUrl}/goals/current`;
    console.log('Calling API:', url);
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      // If no goal exists (404), return null instead of throwing
      if (response.status === 404) {
        console.log('404 - No goal found');
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Goal data from API:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Get current goal failed:', error);
      throw error;
    }
  }

  async setGoal(year: number, targetCount: number, period = 'year') {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify({ year, target_count: targetCount, period }),
    });
  }

  async deleteGoal(year: number) {
    return this.request(`/goals/${year}`, {
      method: 'DELETE',
    });
  }

  async getPaceNeeded(year: number) {
    return this.request(`/goals/${year}/pace`);
  }

  // Continuations
  async getAllContinuations() {
    return this.request('/continuations');
  }

  async getContinuationGraph() {
    return this.request('/continuations/graph');
  }

  async addContinuation(fromBookId: number, toBookId: number) {
    return this.request('/continuations', {
      method: 'POST',
      body: JSON.stringify({ from_book_id: fromBookId, to_book_id: toBookId }),
    });
  }

  async removeContinuation(fromBookId: number, toBookId: number) {
    return this.request(`/continuations/${fromBookId}/${toBookId}`, {
      method: 'DELETE',
    });
  }

  async getBookChain(bookId: number, direction = 'both') {
    return this.request(`/books/${bookId}/chain?direction=${direction}`);
  }
}

export default new ApiService();

