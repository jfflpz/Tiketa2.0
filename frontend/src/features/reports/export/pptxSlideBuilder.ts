import pptxgen from 'pptxgenjs';

export interface SlideContentParams {
  title: string;
  reportingPeriod: string;
  chartImageBase64: string;
  explanationMarkdown: string;
}

export const SLIDE_GEOMETRY = {
  slideWidth: 13.333,
  slideHeight: 7.5,
  titleX: 0.91,
  titleY: 0.45,
  titleW: 11.54,
  titleH: 0.95,
  chartX: 0.91,
  chartY: 1.63,
  chartW: 11.54,
  chartH: 3.90,
  explX: 0.91,
  explY: 5.75,
  explW: 11.54,
  explH: 1.30,
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
            fontSize: 16,
            color: '333333',
            fontFace: 'Arial',
          },
        };
      }
      return {
        text: part,
        options: {
          bold: false,
          fontSize: 16,
          color: '333333',
          fontFace: 'Arial',
        },
      };
    });
}

/**
 * Builds a single standard executive report slide on a 16:9 presentation.
 *
 * DESIGN INVARIANTS:
 * 1. Slide Size: 16:9 widescreen (13.333" x 7.5") via LAYOUT_WIDE.
 * 2. Title & Period: Positioned above chart (Y=0.45"). Title is ~44pt bold #333333, Period is ~30pt regular #333333.
 * 3. Chart Container: Embedded high-resolution PNG image at X=0.91", Y=1.63", W=11.54", H=3.90" (Aspect ratio ~2.96:1).
 *    NOTE: Chart bars are embedded as pixel-accurate image elements, NOT editable PowerPoint vector shapes.
 * 4. Explanatory Text: Positioned below chart (Y=5.75") at ~16pt #333333 with key metrics bolded.
 * 5. Zero cover or closing slides; zero decorative branding.
 */
export function addExecutiveReportSlide(
  pres: pptxgen,
  params: SlideContentParams
): pptxgen.Slide {
  const slide = pres.addSlide();

  // Slide background
  slide.background = { color: 'FFFFFF' };

  // 1. Header Text: Title (bold ~44pt #333333) + Reporting Period (regular ~30pt #333333)
  slide.addText(
    [
      {
        text: params.title + '  ',
        options: {
          bold: true,
          fontSize: 44,
          color: '333333',
          fontFace: 'Arial',
        },
      },
      {
        text: params.reportingPeriod,
        options: {
          bold: false,
          fontSize: 30,
          color: '333333',
          fontFace: 'Arial',
        },
      },
    ],
    {
      x: SLIDE_GEOMETRY.titleX,
      y: SLIDE_GEOMETRY.titleY,
      w: SLIDE_GEOMETRY.titleW,
      h: SLIDE_GEOMETRY.titleH,
      valign: 'bottom',
      align: 'left',
      margin: 0,
    }
  );

  // 2. Chart Image Box (X=0.91", Y=1.63", W=11.54", H=3.90")
  // Chart is rendered at exact 2.96:1 native proportion with 1pt border #7F7F7F
  slide.addImage({
    data: params.chartImageBase64,
    x: SLIDE_GEOMETRY.chartX,
    y: SLIDE_GEOMETRY.chartY,
    w: SLIDE_GEOMETRY.chartW,
    h: SLIDE_GEOMETRY.chartH,
  });

  // 3. Explanatory Text Box (X=0.91", Y=5.75", W=11.54", H=1.30")
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
  pres.title = 'Tiketa Executive Operations Reports';
  return pres;
}
