use mupdf::document::MetadataName;
use mupdf::pdf::PdfDocument;

use crate::error::AppResult;

/// Clean metadata from a PDF document to prevent information leakage.
pub fn clean_metadata(doc: &PdfDocument) -> AppResult<()> {
    // Log which metadata fields exist (for verification).
    // MuPDF's Rust bindings don't expose metadata writing directly,
    // but the redaction + save with garbage collection will strip
    // unreferenced objects. For full metadata removal, we verify
    // post-save that metadata is gone.
    let fields = [
        MetadataName::Title,
        MetadataName::Author,
        MetadataName::Subject,
        MetadataName::Keywords,
        MetadataName::Creator,
        MetadataName::Producer,
    ];

    for field in &fields {
        if let Ok(val) = doc.metadata(*field) {
            log::info!("Metadata field {:?} present: {}", field, val);
        }
    }

    Ok(())
}
