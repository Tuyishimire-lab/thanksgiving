export function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseInlineMarkdown(text) {
  if (!text) return "";
  let escaped = escapeHtml(text);
  // Bold: **text** or __text__
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__(.*?)__/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/_(.*?)_/g, "<em>$1</em>");
  return escaped;
}

export function parseContentBlocks(text) {
  if (!text) return [];
  
  // Normalize newlines
  const normalizedText = text.replace(/\r\n/g, "\n");
  const lines = normalizedText.split("\n");
  const blocks = [];
  
  let currentBlock = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Empty line closes any open block
    if (trimmed === "") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }
    
    // Check if it's a blockquote (starts with ">")
    if (trimmed.startsWith(">")) {
      const content = trimmed.substring(1).trim();
      const parsedContent = parseInlineMarkdown(content);
      
      if (currentBlock && currentBlock.type === "blockquote") {
        currentBlock.text += "<br />" + parsedContent;
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: "blockquote",
          text: parsedContent
        };
      }
      continue;
    }
    
    // Check if it's a list item (starts with "- ", "* ", or number list)
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const isNumbered = /^\d+\.\s/.test(trimmed);
    
    if (isBullet || isNumbered) {
      let content = trimmed;
      if (isBullet) {
        content = trimmed.substring(2);
      } else {
        content = trimmed.replace(/^\d+\.\s/, "");
      }
      const parsedContent = parseInlineMarkdown(content);
      
      if (currentBlock && currentBlock.type === "list") {
        currentBlock.items.push(parsedContent);
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: "list",
          items: [parsedContent]
        };
      }
      continue;
    }
    
    // Default: paragraph line
    const parsedContent = parseInlineMarkdown(trimmed);
    if (currentBlock && currentBlock.type === "paragraph") {
      currentBlock.text += " " + parsedContent;
    } else {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: "paragraph",
        text: parsedContent
      };
    }
  }
  
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  
  return blocks;
}
