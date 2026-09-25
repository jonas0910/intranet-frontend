import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  apiResponseTime: number;
  errorRate: number;
}

export interface LazyLoadConfig {
  threshold: number;
  rootMargin: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metricsSubject = new BehaviorSubject<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    apiResponseTime: 0,
    errorRate: 0
  });

  private lazyLoadConfig: LazyLoadConfig = {
    threshold: 0.1,
    rootMargin: '50px',
    enabled: true
  };

  private intersectionObserver?: IntersectionObserver;
  private performanceObserver?: PerformanceObserver;
  private apiCallTimes = new Map<string, number>();
  private errorCount = 0;
  private totalRequests = 0;

  public metrics$ = this.metricsSubject.asObservable();

  constructor() {
    this.initializePerformanceMonitoring();
    this.initializeLazyLoading();
  }

  // Performance Monitoring
  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        this.processPerformanceEntries(list.getEntries());
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
      });
    }

    // Monitor memory usage
    this.monitorMemoryUsage();
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    const currentMetrics = this.metricsSubject.value;
    let updated = false;

    entries.forEach(entry => {
      switch (entry.entryType) {
        case 'navigation':
          const navEntry = entry as PerformanceNavigationTiming;
          currentMetrics.loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
          updated = true;
          break;

        case 'paint':
          if (entry.name === 'first-contentful-paint') {
            currentMetrics.renderTime = entry.startTime;
            updated = true;
          }
          break;

        case 'resource':
          if (entry.name.includes('/api/')) {
            this.updateApiResponseTime(entry.duration);
            updated = true;
          }
          break;
      }
    });

    if (updated) {
      this.metricsSubject.next({ ...currentMetrics });
    }
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const currentMetrics = this.metricsSubject.value;
        currentMetrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        this.metricsSubject.next({ ...currentMetrics });
      }, 5000);
    }
  }

  // API Performance Tracking
  trackApiCall(url: string): void {
    this.apiCallTimes.set(url, performance.now());
    this.totalRequests++;
  }

  trackApiResponse(url: string, success: boolean): void {
    const startTime = this.apiCallTimes.get(url);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.updateApiResponseTime(duration);
      this.apiCallTimes.delete(url);
    }

    if (!success) {
      this.errorCount++;
    }

    this.updateErrorRate();
  }

  private updateApiResponseTime(duration: number): void {
    const currentMetrics = this.metricsSubject.value;
    // Calculate moving average
    currentMetrics.apiResponseTime = (currentMetrics.apiResponseTime + duration) / 2;
    this.metricsSubject.next({ ...currentMetrics });
  }

  private updateErrorRate(): void {
    const currentMetrics = this.metricsSubject.value;
    currentMetrics.errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
    this.metricsSubject.next({ ...currentMetrics });
  }

  // Lazy Loading
  private initializeLazyLoading(): void {
    if (!this.lazyLoadConfig.enabled || !('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            this.loadLazyContent(element);
            this.intersectionObserver?.unobserve(element);
          }
        });
      },
      {
        threshold: this.lazyLoadConfig.threshold,
        rootMargin: this.lazyLoadConfig.rootMargin
      }
    );
  }

  observeLazyElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  private loadLazyContent(element: HTMLElement): void {
    // Trigger lazy loading event
    element.dispatchEvent(new CustomEvent('lazyload'));
    
    // Load images
    const images = element.querySelectorAll('img[data-src]');
    images.forEach(img => {
      const imgElement = img as HTMLImageElement;
      imgElement.src = imgElement.dataset['src'] || '';
      imgElement.removeAttribute('data-src');
    });

    // Load other lazy content
    const lazyElements = element.querySelectorAll('[data-lazy]');
    lazyElements.forEach(el => {
      const lazyElement = el as HTMLElement;
      lazyElement.classList.add('loaded');
    });
  }

  // Virtual Scrolling Support
  calculateVisibleRange(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    totalItems: number,
    buffer: number = 5
  ): { start: number; end: number; offset: number } {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const end = Math.min(totalItems, start + visibleCount + buffer * 2);
    const offset = start * itemHeight;

    return { start, end, offset };
  }

  // Debounced Operations
  createDebouncedObservable<T>(source: Observable<T>, delay: number = 300): Observable<T> {
    return source.pipe(
      debounceTime(delay),
      distinctUntilChanged()
    );
  }

  // Image Optimization
  optimizeImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
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
            const optimizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(optimizedFile);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        }, file.type, quality);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Memory Management
  cleanupUnusedResources(): void {
    // Clean up blob URLs
    const blobUrls = document.querySelectorAll('[src^="blob:"]');
    blobUrls.forEach(element => {
      const src = (element as HTMLElement).getAttribute('src');
      if (src) {
        URL.revokeObjectURL(src);
      }
    });

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // Network Optimization
  preloadResource(url: string, type: 'script' | 'style' | 'image' | 'fetch' = 'fetch'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  }

  prefetchResource(url: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  // Connection Quality Detection
  getConnectionQuality(): Observable<'slow' | 'fast' | 'unknown'> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return fromEvent(connection, 'change').pipe(
        startWith(null),
        map(() => {
          const effectiveType = connection.effectiveType;
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            return 'slow';
          } else if (effectiveType === '3g' || effectiveType === '4g') {
            return 'fast';
          }
          return 'unknown';
        })
      );
    }

    return new BehaviorSubject<'slow' | 'fast' | 'unknown'>('unknown');
  }

  // Bundle Splitting Support
  loadModuleAsync<T>(moduleLoader: () => Promise<T>): Promise<T> {
    return moduleLoader().catch(error => {
      console.error('Failed to load module:', error);
      throw error;
    });
  }

  // Performance Recommendations
  getPerformanceRecommendations(): string[] {
    const metrics = this.metricsSubject.value;
    const recommendations: string[] = [];

    if (metrics.loadTime > 3000) {
      recommendations.push('Considera optimizar el tiempo de carga de la página');
    }

    if (metrics.memoryUsage > 0.8) {
      recommendations.push('Alto uso de memoria detectado, considera limpiar recursos no utilizados');
    }

    if (metrics.apiResponseTime > 1000) {
      recommendations.push('Los tiempos de respuesta de la API son lentos');
    }

    if (metrics.errorRate > 0.05) {
      recommendations.push('Alta tasa de errores detectada');
    }

    return recommendations;
  }

  // Configuration
  updateLazyLoadConfig(config: Partial<LazyLoadConfig>): void {
    this.lazyLoadConfig = { ...this.lazyLoadConfig, ...config };
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.initializeLazyLoading();
    }
  }

  // Cleanup
  destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.cleanupUnusedResources();
  }
}