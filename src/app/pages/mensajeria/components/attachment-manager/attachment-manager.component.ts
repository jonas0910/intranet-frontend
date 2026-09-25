import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AttachmentService } from '../../services/attachment.service';
import { 
  Attachment, 
  AttachmentUpload, 
  createAttachmentUpload, 
  validateFiles,
  MAX_FILES_PER_MESSAGE,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES 
} from '../../models/attachment.model';

@Component({
  selector: 'app-attachment-manager',
  templateUrl: './attachment-manager.component.html',
  styleUrls: ['./attachment-manager.component.scss']
})
export class AttachmentManagerComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imagePreview') imagePreview!: ElementRef<HTMLImageElement>;
  
  @Input() attachments: AttachmentUpload[] = [];
  @Input() readonly = false;
  @Input() showPreview = true;
  @Input() allowMultiple = true;
  @Input() maxFiles = MAX_FILES_PER_MESSAGE;
  @Input() maxFileSize = MAX_FILE_SIZE;
  @Input() allowedTypes = ALLOWED_FILE_TYPES;
  
  @Output() attachmentsChange = new EventEmitter<AttachmentUpload[]>();
  @Output() fileAdded = new EventEmitter<AttachmentUpload>();
  @Output() fileRemoved = new EventEmitter<AttachmentUpload>();
  @Output() previewRequested = new EventEmitter<AttachmentUpload>();
  @Output() downloadRequested = new EventEmitter<AttachmentUpload>();

  private destroy$ = new Subject<void>();
  
  // UI State
  dragOver = false;
  uploading = false;
  compressing = false;
  
  // Preview
  previewFile?: AttachmentUpload;
  showPreviewModal = false;
  previewUrl?: string;
  
  // Errors
  errors: string[] = [];

  constructor(private attachmentService: AttachmentService) {}

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up preview URLs
    this.cleanupPreviewUrls();
  }

  // File Selection
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    // Reset input
    input.value = '';
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  // File Management
  private addFiles(files: File[]): void {
    this.errors = [];
    
    // Validate files
    const validation = validateFiles(files);
    if (!validation.isValid) {
      this.errors = validation.errors;
      return;
    }
    
    // Check total file limit
    if (this.attachments.length + files.length > this.maxFiles) {
      this.errors = [`Máximo ${this.maxFiles} archivos permitidos`];
      return;
    }
    
    // Process each file
    files.forEach(file => {
      this.processFile(file);
    });
  }

  private async processFile(file: File): Promise<void> {
    try {
      let processedFile = file;
      
      // Compress images if needed
      if (this.isImage(file) && file.size > 1024 * 1024) { // 1MB
        this.compressing = true;
        processedFile = await this.compressImage(file);
        this.compressing = false;
      }
      
      const upload = createAttachmentUpload(processedFile);
      
      // Generate preview for images
      if (this.isImage(processedFile)) {
        upload.previewUrl = await this.generateImagePreview(processedFile);
      }
      
      this.attachments.push(upload);
      this.attachmentsChange.emit(this.attachments);
      this.fileAdded.emit(upload);
      
    } catch (error) {
      console.error('Error processing file:', error);
      this.errors.push(`Error procesando archivo: ${file.name}`);
    }
  }

  removeFile(index: number): void {
    const removed = this.attachments.splice(index, 1)[0];
    
    // Clean up preview URL
    if (removed.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    
    this.attachmentsChange.emit(this.attachments);
    this.fileRemoved.emit(removed);
  }

  // Preview Management
  onPreviewFile(attachment: AttachmentUpload): void {
    if (this.isPreviewable(attachment)) {
      this.previewFile = attachment;
      this.showPreviewModal = true;
      this.previewRequested.emit(attachment);
    }
  }

  onDownloadFile(attachment: AttachmentUpload): void {
    this.downloadRequested.emit(attachment);
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewFile = undefined;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = undefined;
    }
  }

  // Image Processing
  private async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, file.type, quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to generate preview'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private cleanupPreviewUrls(): void {
    this.attachments.forEach(attachment => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
  }

  // File Type Detection
  isImage(file: File | AttachmentUpload): boolean {
    const type = 'type' in file ? file.type : file.file.type;
    return type.startsWith('image/');
  }

  isPdf(file: File | AttachmentUpload): boolean {
    const type = 'type' in file ? file.type : file.file.type;
    return type === 'application/pdf';
  }

  isDocument(file: File | AttachmentUpload): boolean {
    const type = 'type' in file ? file.type : file.file.type;
    const documentTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return documentTypes.includes(type);
  }

  isVideo(file: File | AttachmentUpload): boolean {
    const type = 'type' in file ? file.type : file.file.type;
    return type.startsWith('video/');
  }

  isAudio(file: File | AttachmentUpload): boolean {
    const type = 'type' in file ? file.type : file.file.type;
    return type.startsWith('audio/');
  }

  isPreviewable(file: File | AttachmentUpload): boolean {
    return this.isImage(file) || this.isPdf(file);
  }

  // UI Helpers
  getFileIcon(file: File | AttachmentUpload): string {
    if (this.isImage(file)) return 'fas fa-image';
    if (this.isPdf(file)) return 'fas fa-file-pdf';
    if (this.isDocument(file)) return 'fas fa-file-word';
    if (this.isVideo(file)) return 'fas fa-file-video';
    if (this.isAudio(file)) return 'fas fa-file-audio';
    return 'fas fa-file';
  }

  getFileColor(file: File | AttachmentUpload): string {
    if (this.isImage(file)) return 'text-success';
    if (this.isPdf(file)) return 'text-danger';
    if (this.isDocument(file)) return 'text-primary';
    if (this.isVideo(file)) return 'text-info';
    if (this.isAudio(file)) return 'text-warning';
    return 'text-muted';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileName(file: File | AttachmentUpload): string {
    return 'name' in file ? file.name : file.file.name;
  }

  getFileSize(file: File | AttachmentUpload): number {
    return 'size' in file ? file.size : file.file.size;
  }

  getFileType(file: File | AttachmentUpload): string {
    return 'type' in file ? file.type : file.file.type;
  }

  // Validation
  canAddMoreFiles(): boolean {
    return this.attachments.length < this.maxFiles;
  }

  getAcceptedTypes(): string {
    return this.allowedTypes.join(',');
  }

  // Getters for template
  get hasAttachments(): boolean {
    return this.attachments.length > 0;
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  get totalSize(): number {
    return this.attachments.reduce((total, attachment) => {
      return total + this.getFileSize(attachment);
    }, 0);
  }

  get isAtMaxFiles(): boolean {
    return this.attachments.length >= this.maxFiles;
  }

  // Actions
  openFileDialog(): void {
    this.fileInput.nativeElement.click();
  }

  clearAll(): void {
    this.cleanupPreviewUrls();
    this.attachments.length = 0;
    this.attachmentsChange.emit(this.attachments);
    this.errors = [];
  }

  clearErrors(): void {
    this.errors = [];
  }
}