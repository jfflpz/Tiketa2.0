import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { ExportChartRenderer } from './ExportChartRenderer';

/**
 * Offscreen DOM renderer and high-resolution chart capture utility.
 * Renders the chart at exact 2.96:1 aspect ratio (1896x640px)
 * and exports as PNG data URL for slide embedding.
 */
export async function captureChartImage(reportId: number, data: any[]): Promise<string> {
  // If in pure Node environment without document/window
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('DOM environment unavailable for chart capture.');
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1896px';
  container.style.height = '640px';
  container.style.overflow = 'hidden';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#FFFFFF';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(React.createElement(ExportChartRenderer, { reportId, data }));

    // 1. Wait for document fonts to be ready
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Font loading failure fallback
      }
    }

    // 2. Wait for layout and DOM paint (double rAF)
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      } else {
        setTimeout(resolve, 50);
      }
    });

    // 3. Confirm target chart element exists
    const chartElem = container.querySelector('#pptx-export-chart-canvas') as HTMLElement;
    const target = chartElem || container;

    // 4. Capture high-res PNG image via html-to-image
    const dataUrl = await toPng(target, {
      pixelRatio: 1,
      backgroundColor: '#FFFFFF',
      cacheBust: true,
      skipAutoScale: true,
    });

    if (!dataUrl || dataUrl.length < 50) {
      throw new Error(`Chart capture produced invalid data URL for report ${reportId}.`);
    }

    return dataUrl;
  } catch (err: any) {
    // Propagate failure - do NOT return a 1x1 fallback that masks capture failure
    console.error(`Chart capture failed for report ${reportId}:`, err);
    throw new Error(`Chart capture failed for report ${reportId}: ${err?.message || 'Unknown render error'}`);
  } finally {
    try {
      root.unmount();
    } catch {}
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
