export interface CreateAppPayload {
  name: string;
  repoUrl: string;
  rootDir?: string;
}

export interface QueryApp {
    userId?: string
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

  export interface UpdateAppPayload {
    name?: string
    repoUrl?: string
    status?:  'IDLE' | 'BUILDING' | 'SYNCING' | 'RUNNING' | 'STOPPED' | 'ERROR'
    rootDir?: string
    domain?: string
  }