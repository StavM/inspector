import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RemoteEntryInspectorService, RemoteEntryInfo } from './remote-entry-inspector.service';
import { PackageSizeChartComponent } from './package-size-chart.component';

@Component({
  selector: 'app-remote-entry-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, PackageSizeChartComponent],
  template: `
    <div class="dark-theme">
      <h2>Remote Entry Inspector</h2>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <select (change)="onPredefinedSelect($event)" style="max-width: 300px;">
          <option value="">Select predefined remoteEntry...</option>
          <option *ngFor="let entry of predefinedEntries" [value]="entry.remoteEntry">
            {{ entry.displayName || entry.routePath }}
          </option>
        </select>
        <input [(ngModel)]="remoteUrl" placeholder="RemoteEntry.js URL" style="width: 400px;" />
        <button (click)="inspect()">Inspect</button>
      </div>
      <div *ngIf="info">
        <div *ngIf="info.mfeName" class="mfe-name" style="margin-bottom: 16px;">
          <h2>MFE Name: <span>{{ info.mfeName }}</span></h2>
        </div>
        <h3>Shared Libraries</h3>
        <ul>
          <li *ngFor="let lib of info.sharedPackages">{{ lib }}</li>
        </ul>
        <h3>Exposed Modules</h3>
        <ul>
          <li *ngFor="let mod of info.exposedModules">{{ mod }}</li>
        </ul>
        <h3>Bundles ({{ totalBundleSizeKB | number:'1.0-2' }} KB)</h3>
  <app-package-size-chart [data]="bundleChartData"></app-package-size-chart>
        <table border="1" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th>File Name</th>
              <th>URL</th>
              <th>Size (KB)</th>
              <th>MIME Type</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let bundle of info.bundles">
              <td>{{ bundle.fileName }}</td>
              <td style="word-break:break-all">{{ bundle.url }}</td>
              <td>{{ (bundle.size / 1024) | number:'1.0-2' }}</td>
              <td>{{ bundle.mimeType }}</td>
              <td>{{ bundle.lastModified }}</td>
            </tr>
          </tbody>
        </table>
        <h3>Raw remoteEntry.js</h3>
        <textarea [value]="info.raw" rows="10" style="width:100%"></textarea>
      </div>
      <div *ngIf="error" style="color:red">{{ error }}</div>
      <div *ngIf="debug" style="margin-top:16px; color:#ffb300; font-size:13px;">
        <strong>Debug Info:</strong>
        <pre>{{ debug }}</pre>
      </div>
    </div>
  `,
})
export class RemoteEntryInspectorComponent {
  remoteUrl = '/remoteEntry.js';
  info: RemoteEntryInfo | null = null;
  error: string | null = null;
  debug: string | null = null;
  predefinedEntries = [

  ];

  constructor(private inspector: RemoteEntryInspectorService) {}

  async onPredefinedSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.remoteUrl = value;
      await this.inspect();
    }
  }

  get totalBundleSizeKB(): number {
    if (!this.info || !Array.isArray(this.info.bundles)) return 0;
    return this.info.bundles.reduce((sum: number, b: any) => sum + b.size, 0) / 1024;
  }

  get bundleChartData(): { name: string; size: number }[] {
    if (!this.info?.bundles) return [];
  return this.info.bundles.map((b: any) => ({ name: b.fileName || b.url, size: b.size / 1024 }));
  }

  async inspect() {
    this.error = null;
    this.info = null;
    this.debug = null;
    if (!this.remoteUrl) {
      this.error = 'Please enter a remoteEntry.js URL.';
      return;
    }
    try {
      this.info = await this.inspector.fetchRemoteEntry(this.remoteUrl);
      this.debug = JSON.stringify(this.info, null, 2);
      if (!this.info.sharedPackages?.length && !this.info.exposedModules?.length && !this.info.bundles?.length) {
        this.error = 'No packages, modules, or bundles found. The remoteEntry.js may not match expected format.';
      }
    } catch (e: any) {
      this.error = 'Failed to fetch or parse remoteEntry.js.';
      this.debug = e?.message || String(e);
    }
  }
}
