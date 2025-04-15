export interface Memory {
    id: string;
    date: string;
    text: string;
    tags: string | null;
  
    // New fields from schema
    createdBy?: string;
    createdDate?: number;
  }