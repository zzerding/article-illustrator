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

const buildMarkdown = (paragraphs, title) => {
  const meta = [
    '---',
    `title: ${title || 'Untitled Article'}`,
    `date: ${new Date().toLocaleDateString()}`,
    'generator: Article Illustrator',
    '---',
    '',
  ].join('\n');

  let imageCounter = 0;
  const lines = paragraphs.map((p) => {
    const parts = [];

    parts.push(p.text);
    parts.push('');

    if (p.imageUrl) {
      imageCounter += 1;
      const ext = getDownloadExtension(p.imageContentType);
      parts.push(`![Illustration ${imageCounter}](images/illustration-${imageCounter}.${ext})`);
      parts.push('');
    }

    return parts.join('\n');
  });

  return meta + lines.join('\n\n');
};

const buildHtml = (paragraphs, title) => {
  let imageCounter = 0;
  const body = paragraphs.map((p, index) => {
    let imageBlock = '';
    if (p.imageUrl) {
      imageCounter += 1;
      imageBlock = `      <div class="image-container">
        <img src="images/illustration-${imageCounter}.${getDownloadExtension(p.imageContentType)}" alt="Illustration ${imageCounter}" />
      </div>`;
    }

    const isFirst = index === 0;
    const textClass = isFirst ? 'text first-paragraph' : 'text';

    return `    <article class="segment">
      <p class="${textClass}">${p.text}</p>
      ${imageBlock}
    </article>`;
  }).join('\n\n');

  const articleTitle = title || 'Article';
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${articleTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Noto+Sans+SC:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #fafaf8;
    --ink: #1a1a1a;
    --accent: #e8622a;
    --border: #e5e7eb;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    background-color: var(--bg);
    color: var(--ink);
    font-family: "Noto Sans SC", sans-serif;
    line-height: 2.0;
    -webkit-font-smoothing: antialiased;
  }

  .wrapper {
    max-width: 800px;
    margin: 0 auto;
    padding: 80px 24px;
  }

  header {
    margin-bottom: 80px;
    text-align: center;
  }

  .meta {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: var(--accent);
    margin-bottom: 24px;
    display: block;
  }

  h1 {
    font-family: "Playfair Display", serif;
    font-size: 3rem;
    line-height: 1.1;
    margin-bottom: 32px;
    font-weight: 700;
  }

  .date {
    font-family: "Playfair Display", serif;
    font-style: italic;
    font-size: 0.9rem;
    opacity: 0.5;
  }

  .segment {
    margin-bottom: 64px;
  }

  .text {
    font-size: 1.125rem;
    margin-bottom: 40px;
    color: rgba(26, 26, 26, 0.9);
  }

  .first-paragraph::first-letter {
    float: left;
    font-family: "Playfair Display", serif;
    font-size: 5.5rem;
    line-height: 0.7;
    padding-top: 14px;
    padding-right: 12px;
    padding-left: 3px;
    color: var(--ink);
  }

  .image-container {
    margin: 64px -24px;
    background: #fff;
    padding: 24px;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  }

  @media (min-width: 768px) {
    .image-container {
      margin: 80px -80px;
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 0;
      overflow: hidden;
    }
  }

  img {
    width: 100%;
    height: auto;
    display: block;
  }

  footer {
    margin-top: 120px;
    padding-top: 40px;
    border-top: 1px solid var(--border);
    text-align: center;
    font-size: 12px;
    opacity: 0.3;
    letter-spacing: 0.1em;
  }

  @media (max-width: 600px) {
    h1 { font-size: 2.2rem; }
    .wrapper { padding: 40px 20px; }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <header>
      <span class="meta">Editorial Edition</span>
      <h1>${articleTitle}</h1>
      <p class="date">Published on ${currentDate} &middot; Illustrated by AI</p>
    </header>

    <main>
      ${body}
    </main>

    <footer>
      CREATED WITH ARTICLE ILLUSTRATOR &middot; POWERED BY POLLINATIONS.AI
    </footer>
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

  const mdContent = buildMarkdown(paragraphs, title);
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
