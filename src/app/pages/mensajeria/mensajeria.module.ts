import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// NgBootstrap
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

// Services
import { MessageService } from './services/message.service';

// Routes
import { MensajeriaRoutingModule } from './mensajeria-routing.module';

@NgModule({
  declarations: [
    // Los componentes son standalone, no se declaran aquí
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    MensajeriaRoutingModule
  ],
  providers: [
    MessageService
  ]
})
export class MensajeriaModule { }