// ABOUTME: Package article + images into downloadable zip
// ABOUTME: Generates a zip archive containing the article in Markdown and HTML formats alongside all generated images

import JSZip from 'jszip';

const getDownloadExtension = (contentType) => {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  if (contentType?.includes('webp')) return 'webp';
  return 'png';
};

const sanitizeFileName = (name) => {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100) || 'article';
};

const buildMarkdown = (paragraphs) => {
  const lines = paragraphs.map((p, index) => {
    const parts = [];

    parts.push(`### Paragraph ${index + 1}`);
    parts.push('');
    parts.push(p.text);
    parts.push('');

    if (p.imageUrl) {
      const ext = getDownloadExtension(p.imageContentType);
      parts.push(`![Illustration ${index + 1}](images/illustration-${index + 1}.${ext})`);
      parts.push('');
    }

    if (p.prompt) {
      parts.push(`>*Prompt: ${p.prompt}*`);
      parts.push('');
    }

    return parts.join('\n');
  });

  return lines.join('\n---\n\n');
};

const buildHtml = (paragraphs, title) => {
  const body = paragraphs.map((p, index) => {
    const imageBlock = p.imageUrl
      ? `      <div class="image-wrapper">
        <img src="images/illustration-${index + 1}.${getDownloadExtension(p.imageContentType)}" alt="Illustration ${index + 1}" />
      </div>`
      : '';

    const promptBlock = p.prompt
      ? `      <p class="prompt">Prompt: ${p.prompt}</p>`
      : '';

    return `    <section class="paragraph">
      <div class="paragraph-header">
        <span class="paragraph-number">Paragraph ${index + 1}</span>
      </div>
      <p class="text">${p.text}</p>
${imageBlock ? imageBlock + '\n' : ''}${promptBlock ? promptBlock + '\n' : ''}    </section>`;
  }).join('\n\n');

  const articleTitle = title || 'Article';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${articleTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Playfair Display", Georgia, serif;
    color: #1a1a1a;
    background: #fafaf8;
    line-height: 1.8;
    padding: 40px 20px;
  }
  .container {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    padding: 60px 48px;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    border: 1px solid #e5e7eb;
  }
  h1 {
    font-size: 2em;
    margin-bottom: 48px;
    line-height: 1.3;
    font-weight: 700;
  }
  .paragraph { margin-bottom: 48px; }
  .paragraph-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .paragraph-number {
    font-size: 11px;
    font-weight: 700;
    color: #e8622a;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    opacity: 0.6;
  }
  .text {
    font-family: "Noto Sans SC", Inter, sans-serif;
    font-size: 16px;
    color: #1a1a1a;
    opacity: 0.8;
    line-height: 1.8;
    margin-bottom: 16px;
  }
  .image-wrapper {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    margin-bottom: 12px;
    border: 1px solid rgba(0,0,0,0.05);
  }
  .image-wrapper img {
    width: 100%;
    height: auto;
    display: block;
  }
  .prompt {
    font-size: 12px;
    color: #1a1a1a;
    opacity: 0.3;
    font-style: italic;
  }
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 36px 0;
  }
</style>
</head>
<body>
<div class="container">
  <h1>${articleTitle}</h1>
${body}
</div>
</body>
</html>`;
};

export const downloadPackage = async (paragraphs, title) => {
  const baseName = sanitizeFileName(title || 'article');
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');

  const imageFetchPromises = paragraphs
    .filter((p) => p.imageUrl)
    .map(async (paragraph, localIndex) => {
      const response = await fetch(paragraph.imageUrl);
      const blob = await response.blob();
      const ext = getDownloadExtension(paragraph.imageContentType || blob.type);
      const fileName = `illustration-${localIndex + 1}.${ext}`;
      imagesFolder.file(fileName, blob);
      return { index: localIndex, fileName, blob, ext };
    });

  await Promise.all(imageFetchPromises);

  const mdContent = buildMarkdown(paragraphs);
  zip.file(`${baseName}.md`, mdContent);

  const htmlContent = buildHtml(paragraphs, title);
  zip.file(`${baseName}.html`, htmlContent);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
};
