import pptxgen from 'pptxgenjs';
import { BP_SLIDE_GEOMETRY, BP_TYPOGRAPHY } from './bpPresentationStandards';

export interface SlideContentParams {
  title: string;
  reportingPeriod: string;
  chartImageBase64: string;
  explanationMarkdown: string;
}

export const SLIDE_GEOMETRY = {
  slideWidth: BP_SLIDE_GEOMETRY.slideWidth,
  slideHeight: BP_SLIDE_GEOMETRY.slideHeight,
  titleX: BP_SLIDE_GEOMETRY.titleX,
  titleY: BP_SLIDE_GEOMETRY.titleY,
  titleW: BP_SLIDE_GEOMETRY.titleW,
  titleH: BP_SLIDE_GEOMETRY.titleH,
  periodY: BP_SLIDE_GEOMETRY.periodY,
  periodH: BP_SLIDE_GEOMETRY.periodH,
  chartX: BP_SLIDE_GEOMETRY.chartX,
  chartY: BP_SLIDE_GEOMETRY.chartY,
  chartW: BP_SLIDE_GEOMETRY.chartW,
  chartH: BP_SLIDE_GEOMETRY.chartH,
  explX: BP_SLIDE_GEOMETRY.explX,
  explY: BP_SLIDE_GEOMETRY.explY,
  explW: BP_SLIDE_GEOMETRY.explW,
  explH: BP_SLIDE_GEOMETRY.explH,
};

/**
 * Validates that all slide elements fit strictly within the 13.333" x 7.5" boundary.
 */
export function validateSlideElementBounds(): { fits: boolean; maxRight: number; maxBottom: number } {
  const maxRight = Math.max(
    SLIDE_GEOMETRY.titleX + SLIDE_GEOMETRY.titleW,
    SLIDE_GEOMETRY.chartX + SLIDE_GEOMETRY.chartW,
    SLIDE_GEOMETRY.explX + SLIDE_GEOMETRY.explW
  );
  const maxBottom = Math.max(
    SLIDE_GEOMETRY.titleY + SLIDE_GEOMETRY.titleH,
    SLIDE_GEOMETRY.chartY + SLIDE_GEOMETRY.chartH,
    SLIDE_GEOMETRY.explY + SLIDE_GEOMETRY.explH
  );

  return {
    fits: maxRight <= SLIDE_GEOMETRY.slideWidth && maxBottom <= SLIDE_GEOMETRY.slideHeight,
    maxRight,
    maxBottom,
  };
}

/**
 * Parses markdown bold (**text**) into pptxgenjs TextItem objects
 * so key findings are rendered in bold while the body is regular text.
 * Strictly uses BP standard 'Helvetica Neue' at 18pt (>14pt minimum) with Dark Charcoal #333333.
 */
function parseMarkdownToTextItems(md: string): pptxgen.TextProps[] {
  const parts = md.split(/(\*\*.*?\*\*)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return {
          text: part.slice(2, -2),
          options: {
            bold: true,
            fontSize: BP_TYPOGRAPHY.BODY_FONT_SIZE,
            color: '333333',
            fontFace: BP_TYPOGRAPHY.FONT_FACE_PPTX,
          },
        };
      }
      return {
        text: part,
        options: {
          bold: false,
          fontSize: BP_TYPOGRAPHY.BODY_FONT_SIZE,
          color: '333333',
          fontFace: BP_TYPOGRAPHY.FONT_FACE_PPTX,
        },
      };
    });
}

/**
 * Builds a single standard executive report slide on a 16:9 presentation.
 *
 * DESIGN INVARIANTS (BP Presentation Standards 11062026):
 * 1. Slide Size: 16:9 widescreen (13.333" x 7.5") via LAYOUT_WIDE.
 * 2. Title and period: Separate frames above the chart at 36pt and 22pt, color #333333, font 'Helvetica Neue'.
 * 3. Chart Container: Embedded high-resolution PNG image at X=0.92", Y=1.63", W=11.50", H=3.88" (exact 11.5" x 3.88" standard).
 * 4. Explanatory Text: Positioned below chart (Y=5.75") at 18pt (>14pt minimum floor) with width exactly matched to chart (11.50").
 * 5. Text color is strictly Dark Charcoal #333333; zero black (#000000).
 */
export function addExecutiveReportSlide(
  pres: pptxgen,
  params: SlideContentParams
): pptxgen.Slide {
  const slide = pres.addSlide();

  // Slide background
  slide.background = { color: 'FFFFFF' };

  slide.addText(params.title, {
    x: SLIDE_GEOMETRY.titleX,
    y: SLIDE_GEOMETRY.titleY,
    w: SLIDE_GEOMETRY.titleW,
    h: SLIDE_GEOMETRY.titleH,
    valign: 'bottom',
    align: 'left',
    margin: 0,
    bold: true,
    fontSize: BP_TYPOGRAPHY.TITLE_FONT_SIZE,
    color: '333333',
    fontFace: BP_TYPOGRAPHY.FONT_FACE_PPTX,
  });
  slide.addText(params.reportingPeriod, {
    x: SLIDE_GEOMETRY.titleX,
    y: SLIDE_GEOMETRY.periodY,
    w: SLIDE_GEOMETRY.titleW,
    h: SLIDE_GEOMETRY.periodH,
    margin: 0,
    fontSize: BP_TYPOGRAPHY.PERIOD_FONT_SIZE,
    bold: false,
    color: '333333',
    fontFace: BP_TYPOGRAPHY.FONT_FACE_PPTX,
  });

  // 2. Chart Image Box (X=0.92", Y=1.63", W=11.50", H=3.88")
  // Chart is rendered at exact Slide 6 dimension with 1.5pt border #333333
  slide.addImage({
    data: params.chartImageBase64,
    x: SLIDE_GEOMETRY.chartX,
    y: SLIDE_GEOMETRY.chartY,
    w: SLIDE_GEOMETRY.chartW,
    h: SLIDE_GEOMETRY.chartH,
  });

  // 3. Explanatory Text Box (X=0.92", Y=5.75", W=11.50", H=1.30")
  const textItems = parseMarkdownToTextItems(params.explanationMarkdown);
  slide.addText(textItems, {
    x: SLIDE_GEOMETRY.explX,
    y: SLIDE_GEOMETRY.explY,
    w: SLIDE_GEOMETRY.explW,
    h: SLIDE_GEOMETRY.explH,
    valign: 'top',
    align: 'left',
    margin: 0,
    lineSpacingMultiple: 1.25,
  });

  return slide;
}

/**
 * Initializes a new 16:9 PptxGenJS presentation instance using LAYOUT_WIDE (13.333" x 7.5").
 */
export function createPresentationInstance(): pptxgen {
  const pres = new pptxgen();
  // In pptxgenjs, LAYOUT_16x9 is 10" x 5.625", while LAYOUT_WIDE is 13.333" x 7.5".
  // Explicitly set LAYOUT_WIDE to match our 13.333" x 7.5" design coordinate space.
  pres.layout = 'LAYOUT_WIDE';
  pres.theme = {
    headFontFace: BP_TYPOGRAPHY.FONT_FACE_PPTX,
    bodyFontFace: BP_TYPOGRAPHY.FONT_FACE_PPTX,
  };
  pres.title = 'Tiketa Executive Operations Reports';
  return pres;
}
