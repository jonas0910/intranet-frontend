import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { DesignSystemService } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-kb-article',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  templateUrl: './kb-article.component.html',
})
export class KbArticleComponent implements OnInit {
  articulo: any = null;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private kbService: KnowledgeBaseService,
    private designSystem: DesignSystemService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('helpdesk');
    const idOrSlug = this.route.snapshot.paramMap.get('id');
    if (idOrSlug) this.cargar(idOrSlug);
  }

  cargar(idOrSlug: string): void {
    this.loading = true;
    this.kbService.getArticulo(idOrSlug).subscribe({
      next: (res) => {
        this.articulo = res.data;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Artículo no encontrado');
        this.loading = false;
      },
    });
  }
}
