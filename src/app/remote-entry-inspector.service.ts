import { Injectable } from '@angular/core';

export interface BundleInfo {
  url: string;
  size: number;
  packages: string[];
  fileName?: string;
  status?: string;
  mimeType?: string;
  downloadTime?: number;
  lastModified?: string;
}



export interface RemoteEntryInfo {
  mfeName?: string;
  sharedPackages: string[];
  exposedModules: string[];
  bundles: BundleInfo[];
  raw: string;
}

@Injectable({ providedIn: 'root' })
export class RemoteEntryInspectorService {
  async fetchRemoteEntry(url: string): Promise<RemoteEntryInfo> {
    const response = await fetch(url);
    const js = await response.text();

    const mfeName = this.extractMfeName(js);
    const moduleKeys = this.extractModuleKeys(js);
    const sharedPackages = this.extractSharedPackages(js);
    const bundleUrls = this.extractBundleUrls(js, url);

    const bundlePromises = bundleUrls.map(async bundleUrl => {
      const start = performance.now();
      let fileName = bundleUrl.split('/').pop() || '';
      try {
        const res = await fetch(bundleUrl);
        const end = performance.now();
        const buf = await res.arrayBuffer();
        const size = buf.byteLength;
        const status = res.status + (res.ok ? ' OK' : ' Error');
        const mimeType = res.headers.get('content-type') || '';
        const lastModified = res.headers.get('last-modified') || '';
        const downloadTime = Math.round(end - start);
        return {
          url: bundleUrl,
          size,
          packages: [],
          fileName,
          status,
          mimeType,
          downloadTime,
          lastModified
        };
      } catch (err) {
        return {
          url: bundleUrl,
          size: 0,
          packages: [],
          fileName,
          status: 'Fetch Error',
          mimeType: '',
          downloadTime: 0,
          lastModified: ''
        };
      }
    });
    let bundles: BundleInfo[] = await Promise.all(bundlePromises);
    bundles = bundles.sort((a, b) => b.size - a.size);

    return {
      mfeName,
      sharedPackages,
      exposedModules: moduleKeys,
      bundles,
      raw: js
    };
  }

  private extractMfeName(js: string): string | undefined {
    const mfeMatch = js.match(/^var\s+([a-zA-Z0-9_$]+),/);
    return mfeMatch ? mfeMatch[1] : undefined;
  }

  private extractModuleKeys(js: string): string[] {
    const modulesMatch = js.match(/__webpack_modules__\s*=\s*\{([\s\S]*?)\};/);
    const moduleKeys: string[] = [];
    if (modulesMatch) {
      const objContent = modulesMatch[1];
      const keyRegex = /"(\.[^\"]+)":/g;
      let keyMatch;
      while ((keyMatch = keyRegex.exec(objContent)) !== null) {
        moduleKeys.push(keyMatch[1]);
      }
    }
    return moduleKeys;
  }

  private extractSharedPackages(js: string): string[] {
    let sharedLibs: { name: string, version: string }[] = [];
    let sharedMatch;
    const cPattern = /c\("([^"]+)",\s*"([^"]+)"/g;
    while ((sharedMatch = cPattern.exec(js)) !== null) {
      sharedLibs.push({ name: sharedMatch[1], version: sharedMatch[2] });
    }
    if (sharedLibs.length === 0) {
      const hPattern = /h\("([^"]+)",\s*"([^"]+)"/g;
      sharedMatch = undefined;
      while ((sharedMatch = hPattern.exec(js)) !== null) {
        sharedLibs.push({ name: sharedMatch[1], version: sharedMatch[2] });
      }
    }
    if (sharedLibs.length === 0) {
      const registerPattern = /register\("([^"]+)",\s*"([^"]+)"/g;
      sharedMatch = undefined;
      while ((sharedMatch = registerPattern.exec(js)) !== null) {
        sharedLibs.push({ name: sharedMatch[1], version: sharedMatch[2] });
      }
    }
    // Deduplicate and filter out 'default@...' and 'default@@...' entries
    return Array.from(new Set(
      sharedLibs
        .map(lib => `${lib.name}@${lib.version}`)
        .filter(pkg => !pkg.startsWith('default@') && !pkg.startsWith('default@@'))
    ));
  }

  private extractBundleUrls(js: string, url: string): string[] {
    let bundleUrls: string[] = [];
    let baseUrl = url.replace(/\/[^\/]*$/, '/');
    let mappingExtracted = false;

    const bundleUrlRegex = /([a-zA-Z0-9_$]+)\.u\s*=\s*([a-zA-Z0-9_$]+)=>\2\+"\."\+\{([\s\S]*?)\}\[\2\]\+"\.js"/;
    const bundleUrlMatch = js.match(bundleUrlRegex);
    if (bundleUrlMatch) {
      const objContent = bundleUrlMatch[1];
      const entryRegex = /([0-9]+):"([a-f0-9]{16})"/g;
      let entryMatch;
      while ((entryMatch = entryRegex.exec(objContent)) !== null) {
        let bundleId = this.sanitizeBundleName(entryMatch[1]);
        let hash = this.sanitizeBundleName(entryMatch[2]);
        if (bundleId && hash) {
          let bundleUrl = `${baseUrl}${bundleId}.${hash}.js`;
          bundleUrls.push(bundleUrl);
          mappingExtracted = true;
        }
      }
      const quotedEntryRegex = /"([^"]+)":\s*"([a-f0-9]{16})"/g;
      let quotedEntryMatch;
      while ((quotedEntryMatch = quotedEntryRegex.exec(objContent)) !== null) {
        let bundleId = this.sanitizeBundleName(quotedEntryMatch[1]);
        let hash = this.sanitizeBundleName(quotedEntryMatch[2]);
        if (bundleId && hash) {
          let bundleUrl = `${baseUrl}${bundleId}.${hash}.js`;
          bundleUrls.push(bundleUrl);
          mappingExtracted = true;
        }
      }
    }
    if (!mappingExtracted) {
      const mappingObjRegex = /\{([\s\S]*?[a-zA-Z0-9_-]+:"[a-f0-9]+"[\s\S]*?)\}/g;
      let mappingMatch;
      while ((mappingMatch = mappingObjRegex.exec(js)) !== null) {
        const objContent = mappingMatch[1];
        const entryRegex = /"?([^"]+?)"?:"([a-f0-9]+)"/g;
        let entryMatch;
        while ((entryMatch = entryRegex.exec(objContent)) !== null) {
          let bundleId = this.sanitizeBundleName(entryMatch[1]);
          let hash = this.sanitizeBundleName(entryMatch[2]);
          if (bundleId && hash) {
            let bundleUrl = `${baseUrl}${bundleId}.${hash}.js`;
            bundleUrls.push(bundleUrl);
            mappingExtracted = true;
          }
        }
        if (mappingExtracted) break;
      }
    }
    const chunkMappingRegex = /var\s+chunkMapping\s*=\s*\{([\s\S]*?)\};/;
    const chunkMappingMatch = js.match(chunkMappingRegex);
    let chunkMappingIds: string[] = [];
    if (chunkMappingMatch) {
      const objContent = chunkMappingMatch[1];
      const keyRegex = /"([^"]+)":/g;
      let keyMatch;
      while ((keyMatch = keyRegex.exec(objContent)) !== null) {
        chunkMappingIds.push(keyMatch[1]);
      }
    }
    chunkMappingIds = Array.from(new Set(chunkMappingIds));
    chunkMappingIds.forEach(chunkId => {
      if (chunkId && typeof chunkId === 'string') {
        bundleUrls.push(`${baseUrl}${chunkId}.js`);
        mappingExtracted = true;
      }
    });
    if (!mappingExtracted) {
      const simpleChunkPattern = /__webpack_require__\.u\s*=\s*\(chunkId\)\s*=>\s*""\s*\+\s*chunkId\s*\+\s*"\.js"/;
      if (simpleChunkPattern.test(js)) {
        const requireERegex = /__webpack_require__\.e\(["']([^"']+)["']\)/g;
        let requireEMatch;
        let chunkIds: string[] = [];
        while ((requireEMatch = requireERegex.exec(js)) !== null) {
          chunkIds.push(requireEMatch[1]);
        }
        chunkIds = Array.from(new Set(chunkIds));
        chunkIds.forEach(chunkId => {
          if (chunkId && typeof chunkId === 'string') {
            bundleUrls.push(`${baseUrl}${chunkId}.js`);
            mappingExtracted = true;
          }
        });
      }
    }
    const jsUrlRegex = /"(https?:[^"]+\.js)"/g;
    let jsUrlMatch;
    while ((jsUrlMatch = jsUrlRegex.exec(js)) !== null) {
      bundleUrls.push(jsUrlMatch[1]);
    }
    if (bundleUrls.length === 0) {
      bundleUrls.push(url);
    }
    return Array.from(new Set(bundleUrls));
  }

  private sanitizeBundleName(name: string): string {
    return name.trim().replace(/^\+\{|^,+/, '').replace(/,+$/, '');
  }
}
