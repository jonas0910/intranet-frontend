import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesignSystemService } from '../../../services/design-system.service';

@Component({
  selector: 'app-crud-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crud-actions.component.html',
  styleUrls: ['./crud-actions.component.scss']
})
export class CrudActionsComponent implements OnInit {
  @Input() showView: boolean = true;
  @Input() showEdit: boolean = true;
  @Input() showDelete: boolean = true;
  @Input() disabled: boolean = false;
  @Input() btnViewClass: string = '';
  @Input() btnEditClass: string = '';
  @Input() btnDeleteClass: string = '';
  @Input() subsystem: string = '';

  @Output() onView = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<void>();

  constructor(private ds: DesignSystemService) {}

  ngOnInit(): void {
    const cv = this.subsystem
      ? this.ds.getCrudViewFor(this.subsystem)
      : this.ds.crudView;
    if (!this.btnViewClass) this.btnViewClass = 'btn-outline-' + cv.viewBtnClass.replace('btn-', '');
    if (!this.btnEditClass) this.btnEditClass = 'btn-outline-' + cv.editBtnClass.replace('btn-', '');
    if (!this.btnDeleteClass) this.btnDeleteClass = 'btn-outline-' + cv.deleteBtnClass.replace('btn-', '');
  }
}
