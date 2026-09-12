import { DatabaseEngine } from "../generated/enums";

export interface CreateDatabasePayload {
  userId: string;
  name: string;
  engine: DatabaseEngine;
  storage?: string;
}

export interface QueryDatabase {
  userId?: string;
  engine?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateDatabasePayload {
  name?: string;
  storage?: string;
}

export interface ConnectDatabasePayload {
  appId: string;
}
