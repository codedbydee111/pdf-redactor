use mupdf::pdf::PdfDocument;
use serde::Serialize;

use crate::error::AppResult;
use crate::pdf::text_extraction;

#[derive(Debug, Serialize)]
pub struct VerificationResult {
    pub passed: bool,
    pub pages_checked: u32,
    pub leaked_strings: Vec<LeakedString>,
}

#[derive(Debug, Serialize)]
pub struct LeakedString {
    pub page: u32,
    pub text: String,
}

/// Verify that redacted content is truly removed from the document.
pub fn verify_redaction(
    doc: &PdfDocument,
    redacted_strings: &[String],
) -> AppResult<VerificationResult> {
    let page_count = doc.page_count()? as u32;
    let mut leaked = Vec::new();

    for page_num in 0..page_count {
        let page_text = text_extraction::extract_page_text(doc, page_num as i32)?;

        for target in redacted_strings {
            if page_text
                .full_text
                .to_lowercase()
                .contains(&target.to_lowercase())
            {
                leaked.push(LeakedString {
                    page: page_num,
                    text: target.clone(),
                });
            }
        }
    }

    Ok(VerificationResult {
        passed: leaked.is_empty(),
        pages_checked: page_count,
        leaked_strings: leaked,
    })
}
