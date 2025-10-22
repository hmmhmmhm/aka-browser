/**
 * Generate HTML templates for renderer pages
 */

interface HtmlOptions {
  title: string;
  themeColor: string;
  scriptPath: string;
  cssPath?: string;
  queryParams?: Record<string, string>;
}

export function generateHtml(options: HtmlOptions): string {
  const { title, themeColor, scriptPath, cssPath, queryParams } = options;
  
  // Inject query parameters as a global variable
  const queryParamsScript = queryParams 
    ? `<script>window.__QUERY_PARAMS__ = ${JSON.stringify(queryParams)};</script>`
    : '';
  
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="theme-color" content="${themeColor}" />
    <title>${title}</title>
    ${cssPath ? `<link rel="stylesheet" href="${cssPath}" />` : ''}
    ${queryParamsScript}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptPath}"></script>
  </body>
</html>`;
}

export function generateBlankPageHtml(scriptPath: string, cssPath?: string): string {
  return generateHtml({
    title: 'Blank Page',
    themeColor: '#1c1c1e',
    scriptPath,
    cssPath,
  });
}

export function generateErrorPageHtml(
  scriptPath: string, 
  cssPath?: string, 
  queryParams?: Record<string, string>
): string {
  return generateHtml({
    title: 'Error',
    themeColor: '#2d2d2d',
    scriptPath,
    cssPath,
    queryParams,
  });
}
