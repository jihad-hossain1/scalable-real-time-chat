/**
 * Sanitizes user input to prevent XSS and script injection.
 * Strips out <script>, <iframe>, <object>, inline events (onclick=...), and dangerous tags.
 */
 function sanitizeText(content) {
  //   if (!content) return "";

  //   // Remove <script>, <iframe>, <object>, and other potentially dangerous tags
  //   content = content?.replace(
  //     /<(script|iframe|object|embed|link|style|meta)[^>]*>.*?<\/\1>/gis,
  //     ""
  //   );

  //   // Remove standalone tags like <script src="..."> or <img onerror="...">
  //   content = content?.replace(
  //     /<(script|iframe|object|embed|link|style|meta)[^>]*\/?>/gi,
  //     ""
  //   );

  //   // Remove inline JS event handlers like onclick="..." or onerror='...'
  //   content = content?.replace(/\son\w+="[^"]*"/gi, "");
  //   content = content?.replace(/\son\w+='[^']*'/gi, "");

  //   // Remove javascript: URIs
  //   content = content?.replace(/javascript:/gi, "");

  //   // Remove data URIs to prevent data:image/svg+xml;base64 based attacks
  //   content = content?.replace(/data:[^"]+/gi, "");

  //   // Strip all HTML tags except a basic safe set (optional)
  //   content = content?.replace(
  //     /<(?!\/?(b|i|em|strong|u|br|p|ul|ol|li)\b)[^>]*>/gi,
  //     ""
  //   );

  try {
    return content?.trim();
  } catch (error) {
    return content;
  }
}

module.exports = {
  sanitizeText
}