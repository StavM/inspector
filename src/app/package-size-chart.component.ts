import { Component, Input } from '@angular/core';

import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-package-size-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div *ngIf="data && data.length" style="margin: 24px 0;">
      <div style="max-width: 100%; overflow-x: auto;">
        <h4>Package Size Chart</h4>
        <div style="display: flex; align-items: flex-end; height: 180px; gap: 8px; width: 100%;">
        <div *ngFor="let pkg of data" style="flex: 1; text-align: center;">
          <div
            [style.height]="(pkg.size / maxSize * 150) + 'px'"
            [style.background]="getHeatColor(pkg.size)"
            style="border-radius: 4px 4px 0 0; margin-bottom: 4px; transition: height 0.3s;"
            [title]="pkg.name + ': ' + (pkg.size | number:'1.0-2') + ' KB'"
          ></div>
          <div style="font-size: 12px; color: #90caf9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ pkg.name }}
          </div>
          <div style="font-size: 11px; color: #e0e0e0;">
            {{ pkg.size | number:'1.0-2' }} KB
          </div>
        </div>
      </div>
    </div>
  `
})
export class PackageSizeChartComponent {
  @Input() data: { name: string; size: number }[] = [];
  get maxSize(): number {
    return this.data.reduce((max, pkg) => Math.max(max, pkg.size), 1);
  }

  getHeatColor(size: number): string {
    // Heatmap from blue (small) to red (large)
    if (!this.maxSize) return '#1976d2';
    const percent = size / this.maxSize;
    // Interpolate from blue (#1976d2) to red (#ef5350)
    const r1 = 25, g1 = 118, b1 = 210; // blue
    const r2 = 239, g2 = 83, b2 = 80;  // red
    const r = Math.round(r1 + (r2 - r1) * percent);
    const g = Math.round(g1 + (g2 - g1) * percent);
    const b = Math.round(b1 + (b2 - b1) * percent);
    return `rgb(${r},${g},${b})`;
  }
}
