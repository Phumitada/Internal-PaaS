export interface CreateAppPayload {
  userId: string;
  name: string;
  repoUrl: string;
}

export interface QueryApp {
    userId: string
    status?: string | string[];
    page?: number;
    limit?: number;
    search?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface AdminQueryApp {
    status?: string   
    page?: number
    limit?: number
    search?: string
    sortOrder?: 'asc' | 'desc'
  }