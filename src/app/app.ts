
import { Component, ViewEncapsulation } from '@angular/core';
import { RemoteEntryInspectorComponent } from './remote-entry-inspector.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RemoteEntryInspectorComponent, FormsModule, CommonModule],
  templateUrl: './app.html',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './app.css'
})
export class App {
  protected title = 'mfe-inspector';
}
