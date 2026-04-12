use std::collections::HashMap;

use mupdf::color::AnnotationColor;
use mupdf::pdf::annotation::PdfAnnotationType;
use mupdf::pdf::page::PdfPage;
use mupdf::pdf::PdfDocument;
use mupdf::Rect;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Deserialize)]
pub struct RedactionRegion {
    pub page: u32,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Serialize)]
pub struct RedactionResult {
    pub pages_affected: u32,
    pub regions_applied: u32,
}

/// Apply redactions to a document and save to the output path.
/// This performs TRUE content removal — not visual overlay.
/// Saves with garbage collection and clean to strip unreferenced
/// objects including metadata.
pub fn apply_redactions(
    doc: &PdfDocument,
    regions: &[RedactionRegion],
    output_path: &str,
) -> AppResult<RedactionResult> {
    let mut pages_affected = 0u32;
    let mut regions_applied = 0u32;

    // Group regions by page
    let mut regions_by_page: HashMap<u32, Vec<&RedactionRegion>> = HashMap::new();
    for region in regions {
        regions_by_page
            .entry(region.page)
            .or_default()
            .push(region);
    }

    for (&page_num, page_regions) in &regions_by_page {
        let base_page = doc.load_page(page_num as i32)?;
        let mut page: PdfPage = base_page
            .try_into()
            .map_err(|e: mupdf::Error| AppError::Pdf(e.to_string()))?;

        for region in page_regions {
            let rect = Rect::new(
                region.x,
                region.y,
                region.x + region.width,
                region.y + region.height,
            );

            // Create a Redact annotation on this page and set its rectangle
            let mut annot = page
                .create_annotation(PdfAnnotationType::Redact)
                .map_err(|e| AppError::Pdf(format!("Failed to create redaction annotation: {e}")))?;
            annot
                .set_rect(rect)
                .map_err(|e| AppError::Pdf(format!("Failed to set redaction rect: {e}")))?;
            // Black fill so redacted areas appear as black boxes, not white
            annot
                .set_color(AnnotationColor::Gray(0.0))
                .map_err(|e| AppError::Pdf(format!("Failed to set redaction color: {e}")))?;
            regions_applied += 1;
        }

        // Commit annotation changes, then apply redactions — REMOVES content from PDF
        page.update()
            .map_err(|e| AppError::Pdf(format!("Failed to update page: {e}")))?;
        page.redact()
            .map_err(|e| AppError::Pdf(format!("Failed to apply redactions: {e}")))?;
        pages_affected += 1;
    }

    // Save with garbage collection (level 4 = max) and clean enabled
    // to strip unreferenced objects and metadata
    let mut options = mupdf::pdf::PdfWriteOptions::default();
    options.set_garbage_level(4);
    options.set_clean(true);
    doc.save_with_options(output_path, options)
        .map_err(|e| AppError::Pdf(format!("Failed to save redacted PDF: {e}")))?;

    Ok(RedactionResult {
        pages_affected,
        regions_applied,
    })
}
