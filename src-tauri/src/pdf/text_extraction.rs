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

#[derive(Debug, Clone, Serialize)]
pub struct MatchRect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchMatch {
    pub page: u32,
    pub match_text: String,
    pub context_before: String,
    pub context_after: String,
    pub rects: Vec<MatchRect>,
}

/// Internal: one character with its bounding box and line identity.
struct CharInfo {
    ch: char,
    x0: f32,
    y0: f32,
    x1: f32,
    y1: f32,
    /// Distinguishes real extracted chars from synthetic separators.
    is_synthetic: bool,
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

/// Search the entire document for `query`, returning character-precise bounding
/// boxes for every occurrence.
pub fn search_document(doc: &PdfDocument, query: &str, page_count: i32) -> AppResult<Vec<SearchMatch>> {
    let query_lower: Vec<char> = query.to_lowercase().chars().collect();
    if query_lower.is_empty() {
        return Ok(Vec::new());
    }

    let mut matches = Vec::new();

    for page_num in 0..page_count {
        let page = doc.load_page(page_num)?;
        let text_page = page.to_text_page(TextPageFlags::empty())?;

        // Collect every character with its quad-derived bounding box.
        let mut chars: Vec<CharInfo> = Vec::new();

        for block in text_page.blocks() {
            if block.r#type() != TextBlockType::Text {
                continue;
            }
            for line in block.lines() {
                let had_chars_before = chars.len();

                for ch in line.chars() {
                    if let Some(c) = ch.char() {
                        let q = ch.quad();
                        chars.push(CharInfo {
                            ch: c,
                            x0: q.ul.x.min(q.ll.x),
                            y0: q.ul.y.min(q.ur.y),
                            x1: q.ur.x.max(q.lr.x),
                            y1: q.ll.y.max(q.lr.y),
                            is_synthetic: false,
                        });
                    }
                }

                // Insert a synthetic space between lines so "end of line" +
                // "start of next line" doesn't falsely fuse into a match.
                if chars.len() > had_chars_before {
                    let last = chars.last().unwrap();
                    if last.ch != ' ' {
                        chars.push(CharInfo {
                            ch: ' ',
                            x0: 0.0,
                            y0: 0.0,
                            x1: 0.0,
                            y1: 0.0,
                            is_synthetic: true,
                        });
                    }
                }
            }
        }

        // Build a lowercased char array for searching.
        let text_lower: Vec<char> = chars
            .iter()
            .map(|ci| {
                let mut lc = ci.ch.to_lowercase();
                lc.next().unwrap_or(ci.ch)
            })
            .collect();

        // Slide through looking for matches.
        let qlen = query_lower.len();
        if text_lower.len() < qlen {
            continue;
        }

        let mut pos = 0;
        while pos + qlen <= text_lower.len() {
            if text_lower[pos..pos + qlen] == query_lower[..] {
                // Matched text (original case).
                let match_text: String = chars[pos..pos + qlen].iter().map(|c| c.ch).collect();

                // Context: up to 40 chars before / after, trimmed at line boundaries.
                let ctx_start = pos.saturating_sub(40);
                let ctx_end = (pos + qlen + 40).min(chars.len());
                let context_before: String = chars[ctx_start..pos]
                    .iter()
                    .map(|c| c.ch)
                    .collect::<String>()
                    .trim_start()
                    .to_string();
                let context_after: String = chars[pos + qlen..ctx_end]
                    .iter()
                    .map(|c| c.ch)
                    .collect::<String>()
                    .trim_end()
                    .to_string();

                // Compute bounding rects, grouping consecutive chars by line.
                let rects = compute_match_rects(&chars[pos..pos + qlen]);

                if !rects.is_empty() {
                    matches.push(SearchMatch {
                        page: page_num as u32,
                        match_text,
                        context_before,
                        context_after,
                        rects,
                    });
                }

                pos += 1; // allow overlapping matches
            } else {
                pos += 1;
            }
        }
    }

    Ok(matches)
}

/// Given a slice of CharInfos for a single match, group them into one
/// bounding rect per visual line (handles matches that span lines).
fn compute_match_rects(chars: &[CharInfo]) -> Vec<MatchRect> {
    let real: Vec<&CharInfo> = chars.iter().filter(|c| !c.is_synthetic).collect();
    if real.is_empty() {
        return Vec::new();
    }

    let mut rects = Vec::new();
    let mut min_x = real[0].x0;
    let mut min_y = real[0].y0;
    let mut max_x = real[0].x1;
    let mut max_y = real[0].y1;
    let mut line_y = real[0].y0;

    for ch in &real[1..] {
        // If the character's vertical midpoint is far from the current line,
        // start a new rect (threshold: half the current line height).
        let line_h = max_y - min_y;
        let threshold = if line_h > 0.5 { line_h * 0.6 } else { 4.0 };

        if (ch.y0 - line_y).abs() > threshold {
            // Flush current rect with a small vertical padding.
            let pad = (max_y - min_y) * 0.05;
            rects.push(MatchRect {
                x: min_x - pad,
                y: min_y - pad,
                width: (max_x - min_x) + pad * 2.0,
                height: (max_y - min_y) + pad * 2.0,
            });
            min_x = ch.x0;
            min_y = ch.y0;
            max_x = ch.x1;
            max_y = ch.y1;
            line_y = ch.y0;
        } else {
            min_x = min_x.min(ch.x0);
            min_y = min_y.min(ch.y0);
            max_x = max_x.max(ch.x1);
            max_y = max_y.max(ch.y1);
        }
    }

    let pad = (max_y - min_y) * 0.05;
    rects.push(MatchRect {
        x: min_x - pad,
        y: min_y - pad,
        width: (max_x - min_x) + pad * 2.0,
        height: (max_y - min_y) + pad * 2.0,
    });

    rects
}
