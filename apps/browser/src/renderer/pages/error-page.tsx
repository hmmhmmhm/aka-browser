import { useEffect, useState } from 'react';

interface ErrorInfo {
  statusCode: string;
  statusText: string;
  url: string;
}

interface ErrorMessage {
  title: string;
  desc: string;
}

function getErrorInfo(): ErrorInfo {
  // Try to get params from injected global variable first
  const injectedParams = (window as any).__QUERY_PARAMS__;
  if (injectedParams) {
    return {
      statusCode: injectedParams.statusCode || 'UNKNOWN',
      statusText: injectedParams.statusText || 'Unknown Error',
      url: injectedParams.url || '',
    };
  }
  
  // Fallback to URL search params (for backward compatibility)
  const params = new URLSearchParams(window.location.search);
  return {
    statusCode: params.get('statusCode') || 'UNKNOWN',
    statusText: params.get('statusText') || 'Unknown Error',
    url: params.get('url') || window.location.href,
  };
}

function getErrorMessage(statusCode: string, url: string): ErrorMessage {
  const code = parseInt(statusCode);
  let domain: string;
  
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = 'the server';
  }

  // Network errors
  if (code === 105) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because the server could not be found.`,
    };
  }
  if (code === 106) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because your device is not connected to the internet.`,
    };
  }
  if (code === 102) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because the server refused the connection.`,
    };
  }
  if (code === 7 || code === 118) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because the server took too long to respond.`,
    };
  }
  if (code >= 100 && code < 200) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because it could not connect to the server.`,
    };
  }
  if (code >= 200 && code < 300) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because there is a problem with the website's security certificate.`,
    };
  }

  // HTTP errors
  if (code === 404) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because the page could not be found.`,
    };
  }
  if (code >= 400 && code < 500) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because of a client error.`,
    };
  }
  if (code >= 500 && code < 600) {
    return {
      title: 'Aka Browser cannot open the page',
      desc: `Aka Browser could not open the page "${domain}" because the server encountered an error.`,
    };
  }

  return {
    title: 'Aka Browser cannot open the page',
    desc: `Aka Browser could not open the page "${domain}".`,
  };
}

export default function ErrorPage() {
  const [errorInfo, setErrorInfo] = useState<ErrorInfo>({
    statusCode: 'UNKNOWN',
    statusText: 'Unknown Error',
    url: '',
  });
  const [errorMessage, setErrorMessage] = useState<ErrorMessage>({
    title: 'Aka Browser cannot open the page',
    desc: 'Aka Browser could not open the page.',
  });

  useEffect(() => {
    const info = getErrorInfo();
    const message = getErrorMessage(info.statusCode, info.url);
    
    setErrorInfo(info);
    setErrorMessage(message);
    
    // Update page title
    document.title = message.title;
  }, []);

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
            Arial, sans-serif;
          background: #2d2d2d;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #b8b8b8;
        }

        .error-container {
          text-align: center;
          max-width: 600px;
        }

        .error-title {
          font-size: 28px;
          font-weight: 400;
          margin-bottom: 20px;
          color: #b8b8b8;
          letter-spacing: -0.5px;
          text-wrap: balance;
          word-break: keep-all;
        }

        .error-description {
          font-size: 15px;
          line-height: 1.6;
          color: #8e8e8e;
          margin-bottom: 10px;
          text-wrap: balance;
          word-break: keep-all;
        }

        .error-url {
          font-size: 13px;
          color: #6e6e6e;
          word-break: break-all;
          margin-top: 5px;
        }

        @media (max-width: 600px) {
          .error-title {
            font-size: 24px;
          }

          .error-description {
            font-size: 14px;
          }
        }
      `}</style>
      <div className="error-container">
        <h1 className="error-title">{errorMessage.title}</h1>
        <p className="error-description">{errorMessage.desc}</p>
        <p className="error-url">{decodeURIComponent(errorInfo.url)}</p>
      </div>
    </>
  );
}
