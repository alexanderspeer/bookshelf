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
      credentials: 'include' as RequestCredentials, // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        // Try to get error message from response body
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If JSON parsing fails, use default message
        }
        
        if (response.status === 401) {
          // For login/register endpoints, pass through the actual error
          // For other endpoints, it means auth is required
          throw new Error(errorMessage);
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async register(email: string, password: string, username?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });
  }

  async checkUsername(username: string) {
    return this.request(`/auth/username/check?username=${encodeURIComponent(username)}`);
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
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

  // Rankings
  async getRankings() {
    return this.request('/rankings');
  }

  async rerankAllBooks() {
    return this.request('/rankings/rerank-all', {
      method: 'POST',
    });
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
    try {
      return await this.request('/goals/current');
    } catch (error: any) {
      // If no goal exists (404), return null instead of throwing
      if (error.message && (error.message.includes('404') || error.message.includes('No goal set'))) {
        return null;
      }
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

  async getGoalBooks(year: number) {
    return this.request(`/goals/${year}/books`);
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

  // Public bookshelf
  async getPublicBooks() {
    return this.request('/public/books');
  }

  // Public user endpoints
  async getPublicProfile(username: string) {
    return this.request(`/public/users/${encodeURIComponent(username)}/profile`);
  }

  async getPublicShelf(username: string, state?: string) {
    const params = state ? `?state=${encodeURIComponent(state)}` : '';
    return this.request(`/public/users/${encodeURIComponent(username)}/shelf${params}`);
  }

  async getPublicStats(username: string) {
    return this.request(`/public/users/${encodeURIComponent(username)}/stats`);
  }

  // Private user endpoints
  async getMyProfile() {
    return this.request('/me/profile');
  }

  async updateMyProfile(data: { username?: string }) {
    return this.request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateMySettings(isPublic: boolean) {
    return this.request('/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ is_public: isPublic }),
    });
  }

  async getMyShelf(state?: string, limit = 50, offset = 0) {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request(`/me/shelf?${params}`);
  }

  async getMyStats() {
    return this.request('/me/stats');
  }
}

export default new ApiService();

