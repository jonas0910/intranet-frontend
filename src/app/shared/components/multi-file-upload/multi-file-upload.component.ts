import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Lista interna de archivos: evita que al agregar 2+ imágenes el @Input() del padre
 * aún no esté actualizado y solo se envíe la primera.
 */
@Component({
  selector: 'app-multi-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-file-upload.component.html',
  styleUrls: ['./multi-file-upload.component.scss'],
})
export class MultiFileUploadComponent implements OnDestroy, OnChanges {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() files: File[] = [];
  @Output() filesChange = new EventEmitter<File[]>();

  @Input() maxFiles = 20;
  @Input() maxSizeMb = 10;
  @Input() accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
  @Input() label = 'Imágenes y documentos';
  @Input() hint = 'Arrastra aquí o haz clic. Máx. 10 MB por archivo.';
  @Input() zoneClass = 'border border-primary';

  /** Copia local siempre actualizada al agregar/quitar (no depender solo del @Input) */
  lista: File[] = [];

  dragOver = false;
  errors: string[] = [];
  private previewUrls = new Map<File, string>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['files']) {
      const v = this.files;
      this.lista = Array.isArray(v) ? [...v] : [];
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.revokeAllPreviews();
  }

  triggerBrowse(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onZoneClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('button')) return;
    this.triggerBrowse();
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver = false;
    const list = e.dataTransfer?.files;
    if (list?.length) this.addFiles(Array.from(list));
  }

  onFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  private addFiles(incoming: File[]): void {
    this.errors = [];
    const maxBytes = this.maxSizeMb * 1024 * 1024;
    const next = [...this.lista];
    for (const file of incoming) {
      if (next.length >= this.maxFiles) {
        this.errors.push(`Máximo ${this.maxFiles} archivos.`);
        break;
      }
      if (file.size > maxBytes) {
        this.errors.push(`«${file.name}» supera ${this.maxSizeMb} MB.`);
        continue;
      }
      next.push(file);
    }
    if (next.length !== this.lista.length) {
      this.lista = next;
      this.filesChange.emit([...next]);
      this.cdr.detectChanges();
    }
  }

  removeAt(index: number): void {
    const f = this.lista[index];
    if (f) {
      const url = this.previewUrls.get(f);
      if (url) {
        URL.revokeObjectURL(url);
        this.previewUrls.delete(f);
      }
    }
    this.lista = this.lista.filter((_, i) => i !== index);
    this.filesChange.emit([...this.lista]);
    this.cdr.detectChanges();
  }

  esImagen(file: File): boolean {
    return file.type.startsWith('image/');
  }

  previewUrl(file: File): string {
    if (!this.esImagen(file)) return '';
    if (!this.previewUrls.has(file)) {
      this.previewUrls.set(file, URL.createObjectURL(file));
    }
    return this.previewUrls.get(file)!;
  }

  private revokeAllPreviews(): void {
    this.previewUrls.forEach((u) => URL.revokeObjectURL(u));
    this.previewUrls.clear();
  }

  trackByIndex(i: number): number {
    return i;
  }
}
