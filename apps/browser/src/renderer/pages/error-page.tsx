import { useEffect, useState } from 'react';
import './error-page.css';

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
    <div className="error-container">
      <h1 className="error-title">{errorMessage.title}</h1>
      <p className="error-description">{errorMessage.desc}</p>
      <p className="error-url">{decodeURIComponent(errorInfo.url)}</p>
    </div>
  );
}
