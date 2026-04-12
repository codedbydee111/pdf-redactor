use mupdf::pdf::PdfDocument;

use crate::error::{AppError, AppResult};

/// Load a PDF document from a file path.
pub fn load_document(path: &str) -> AppResult<PdfDocument> {
    PdfDocument::open(path).map_err(|e| AppError::Pdf(format!("Failed to open PDF: {e}")))
}

/// Get the page count for a document at the given path.
pub fn page_count(path: &str) -> AppResult<u32> {
    let doc = load_document(path)?;
    let count = doc.page_count().map_err(|e| AppError::Pdf(e.to_string()))?;
    Ok(count as u32)
}
