export interface UserDocument {
  id: string;
  title: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  sharedWith: string[];
}

export interface ActivityLogRow {
  id: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface SharedDocumentRow {
  accessId: string;
  documentId: string;
  title: string;
  fileType: string | null;
  fileSize: number | null;
  documentCreatedAt: string;
  sharedAt: string;
}
