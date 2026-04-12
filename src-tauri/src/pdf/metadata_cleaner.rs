use mupdf::document::MetadataName;
use mupdf::pdf::PdfDocument;

use crate::error::AppResult;

/// Log which metadata fields are present before redaction.
/// Actual removal happens via PdfWriteOptions with garbage collection
/// and clean enabled during save (in redaction_engine).
pub fn clean_metadata(doc: &PdfDocument) -> AppResult<()> {
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
            if !val.is_empty() {
                log::info!("Metadata to strip: {:?} = {}", field, val);
            }
        }
    }

    Ok(())
}
