export interface Attachment {
  id: number;
  message_id: number;
  original_name: string;
  file_size: number;
  human_file_size: string;
  mime_type: string;
  file_extension: string;
  is_scanned: boolean;
  scan_result: 'clean' | 'infected' | 'suspicious' | null;
  is_safe: boolean;
  can_preview: boolean;
  is_image: boolean;
  is_document: boolean;
  icon_class: string;
  created_at: string;
  download_url: string;
  preview_url?: string;
  thumbnail_url?: string;
}

export interface AttachmentUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  attachment?: Attachment;
}

export interface AttachmentResponse {
  success: boolean;
  data: Attachment;
  message?: string;
}

export interface AttachmentListResponse {
  success: boolean;
  data: Attachment[];
  message?: string;
}

export interface AttachmentStatistics {
  total_attachments: number;
  total_size: number;
  by_type: Array<{
    mime_type: string;
    count: number;
    total_size: number;
  }>;
  scanned: number;
  clean: number;
  infected: number;
  suspicious: number;
}

export interface AttachmentPreview {
  content: string; // Base64 encoded content
  mime_type: string;
  original_name: string;
}

// Enums
export enum AttachmentScanResult {
  CLEAN = 'clean',
  INFECTED = 'infected',
  SUSPICIOUS = 'suspicious'
}

export enum AttachmentUploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Constants
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const MAX_FILES_PER_MESSAGE = 5;

// Type guards
export function isAttachment(obj: any): obj is Attachment {
  return obj && 
         typeof obj.id === 'number' && 
         typeof obj.original_name === 'string' &&
         typeof obj.file_size === 'number' &&
         typeof obj.mime_type === 'string';
}

export function isAttachmentUpload(obj: any): obj is AttachmentUpload {
  return obj && 
         obj.file instanceof File &&
         typeof obj.progress === 'number' &&
         typeof obj.status === 'string';
}

export function isSafeAttachment(attachment: Attachment): boolean {
  return attachment.is_safe && 
         attachment.is_scanned && 
         attachment.scan_result === AttachmentScanResult.CLEAN;
}

export function isImageAttachment(attachment: Attachment): boolean {
  return attachment.is_image || attachment.mime_type.startsWith('image/');
}

export function isDocumentAttachment(attachment: Attachment): boolean {
  return attachment.is_document || [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ].includes(attachment.mime_type);
}

export function canPreviewAttachment(attachment: Attachment): boolean {
  return attachment.can_preview && isSafeAttachment(attachment);
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(attachment: Attachment): string {
  if (attachment.icon_class) {
    return attachment.icon_class;
  }
  
  if (isImageAttachment(attachment)) {
    return 'fas fa-image text-info';
  }
  
  if (attachment.mime_type === 'application/pdf') {
    return 'fas fa-file-pdf text-danger';
  }
  
  if (attachment.mime_type.includes('word')) {
    return 'fas fa-file-word text-primary';
  }
  
  if (attachment.mime_type.includes('excel') || attachment.mime_type.includes('spreadsheet')) {
    return 'fas fa-file-excel text-success';
  }
  
  if (attachment.mime_type === 'text/plain') {
    return 'fas fa-file-alt text-secondary';
  }
  
  return 'fas fa-file text-muted';
}

export function getFileTypeDescription(mimeType: string): string {
  const typeMap: { [key: string]: string } = {
    'image/jpeg': 'Imagen JPEG',
    'image/png': 'Imagen PNG',
    'image/gif': 'Imagen GIF',
    'image/webp': 'Imagen WebP',
    'application/pdf': 'Documento PDF',
    'application/msword': 'Documento Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Documento Word',
    'application/vnd.ms-excel': 'Hoja de cálculo Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Hoja de cálculo Excel',
    'text/plain': 'Archivo de texto',
    'text/csv': 'Archivo CSV'
  };
  
  return typeMap[mimeType] || 'Archivo';
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${formatFileSize(MAX_FILE_SIZE)}`
    };
  }
  
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${file.type}`
    };
  }
  
  return { valid: true };
}

export function validateFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check number of files
  if (files.length > MAX_FILES_PER_MESSAGE) {
    errors.push(`Máximo ${MAX_FILES_PER_MESSAGE} archivos por mensaje`);
  }
  
  // Check each file
  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      errors.push(`Archivo ${index + 1}: ${validation.error}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function createAttachmentUpload(file: File): AttachmentUpload {
  return {
    file,
    progress: 0,
    status: AttachmentUploadStatus.PENDING
  };
}

export function getScanResultText(scanResult: string | null): string {
  switch (scanResult) {
    case AttachmentScanResult.CLEAN:
      return 'Limpio';
    case AttachmentScanResult.INFECTED:
      return 'Infectado';
    case AttachmentScanResult.SUSPICIOUS:
      return 'Sospechoso';
    default:
      return 'No escaneado';
  }
}

export function getScanResultColor(scanResult: string | null): string {
  switch (scanResult) {
    case AttachmentScanResult.CLEAN:
      return 'success';
    case AttachmentScanResult.INFECTED:
      return 'danger';
    case AttachmentScanResult.SUSPICIOUS:
      return 'warning';
    default:
      return 'secondary';
  }
}

export function shouldShowSecurityWarning(attachment: Attachment): boolean {
  return !attachment.is_scanned || 
         attachment.scan_result === AttachmentScanResult.INFECTED ||
         attachment.scan_result === AttachmentScanResult.SUSPICIOUS;
}

export function getSecurityWarningMessage(attachment: Attachment): string {
  if (!attachment.is_scanned) {
    return 'Este archivo no ha sido escaneado por seguridad';
  }
  
  if (attachment.scan_result === AttachmentScanResult.INFECTED) {
    return 'Este archivo contiene malware y no es seguro';
  }
  
  if (attachment.scan_result === AttachmentScanResult.SUSPICIOUS) {
    return 'Este archivo es sospechoso y podría no ser seguro';
  }
  
  return '';
}