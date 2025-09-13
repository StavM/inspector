import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-package-treemap-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="data && data.length" style="margin: 24px 0;">
      <h4>Bundle Treemap</h4>
      <div style="display: flex; flex-direction: row; width: 100%; height: 200px; border: 1px solid #333; border-radius: 8px; overflow: hidden; background: #181a20;">
        <div *ngFor="let pkg of data"
          [style.flexGrow]="pkg.size"
          [style.background]="getHeatColor(pkg.size)"
          style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; min-width: 24px; transition: flex-grow 0.3s;"
          [title]="pkg.name + ': ' + (pkg.size | number:'1.0-2') + ' KB'"
        >
          <span style="font-size: 12px; color: #fff; background: rgba(0,0,0,0.4); border-radius: 4px; padding: 2px 6px; margin-bottom: 4px; white-space: nowrap; max-width: 90%; overflow: hidden; text-overflow: ellipsis;">
            {{ pkg.name }}
          </span>
          <span style="font-size: 11px; color: #e0e0e0; margin-bottom: 6px;">
            {{ pkg.size | number:'1.0-2' }} KB
          </span>
        </div>
      </div>
    </div>
  `
})
export class PackageTreemapChartComponent {
  @Input() data: { name: string; size: number }[] = [];
  get maxSize(): number {
    return this.data.reduce((max, pkg) => Math.max(max, pkg.size), 1);
  }
  getHeatColor(size: number): string {
    // Heatmap from blue (small) to red (large)
    if (!this.maxSize) return '#1976d2';
    const percent = size / this.maxSize;
    const r1 = 25, g1 = 118, b1 = 210; // blue
    const r2 = 239, g2 = 83, b2 = 80;  // red
    const r = Math.round(r1 + (r2 - r1) * percent);
    const g = Math.round(g1 + (g2 - g1) * percent);
    const b = Math.round(b1 + (b2 - b1) * percent);
    return `rgb(${r},${g},${b})`;
  }
}
