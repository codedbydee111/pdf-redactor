use mupdf::pdf::PdfDocument;
use mupdf::text_page::{TextBlockType, TextPageFlags};
use serde::Serialize;

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize)]
pub struct TextBlock {
    pub text: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct PageText {
    pub page_num: u32,
    pub blocks: Vec<TextBlock>,
    pub full_text: String,
}

/// Extract text with bounding boxes from a specific page.
pub fn extract_page_text(doc: &PdfDocument, page_num: i32) -> AppResult<PageText> {
    let page = doc.load_page(page_num)?;
    let text_page = page.to_text_page(TextPageFlags::empty())?;

    let mut blocks = Vec::new();
    let mut full_text = String::new();

    for block in text_page.blocks() {
        if block.r#type() != TextBlockType::Text {
            continue;
        }

        for line in block.lines() {
            let mut line_text = String::new();
            let bounds = line.bounds();

            for ch in line.chars() {
                if let Some(c) = ch.char() {
                    line_text.push(c);
                }
            }

            if !line_text.trim().is_empty() {
                blocks.push(TextBlock {
                    text: line_text.clone(),
                    x: bounds.x0,
                    y: bounds.y0,
                    width: bounds.x1 - bounds.x0,
                    height: bounds.y1 - bounds.y0,
                });
                full_text.push_str(&line_text);
                full_text.push('\n');
            }
        }
    }

    Ok(PageText {
        page_num: page_num as u32,
        blocks,
        full_text,
    })
}
