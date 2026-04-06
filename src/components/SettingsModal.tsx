import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [calendarId, setCalendarId] = useState(localStorage.getItem('calendarId') || 'primary');
  const [serverRedirectUri, setServerRedirectUri] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/auth/config')
        .then(res => res.json())
        .then(data => {
          setServerRedirectUri(data.redirectUri);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch auth config:', err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCalendarId = () => {
    localStorage.setItem('calendarId', calendarId);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Settings & OAuth Setup</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Google Calendar ID</h3>
            <p className="text-xs text-gray-600 mb-3">
              Use <code className="bg-gray-100 px-1 rounded">primary</code> for your main calendar, or enter a specific Calendar ID.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="flex-1 block w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="primary"
              />
              <button
                onClick={handleSaveCalendarId}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Google OAuth Redirect URI</h3>
            <p className="text-sm text-gray-600 mb-4">
              To fix the <strong className="text-red-600 font-mono text-xs">Error 400: redirect_uri_mismatch</strong>, you MUST add this exact URL to your Google Cloud Console.
            </p>
            
            <div className="flex items-center space-x-2 mb-4">
              <code className="flex-1 block p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 break-all font-mono min-h-[40px]">
                {loading ? 'Loading...' : serverRedirectUri}
              </code>
              <button
                onClick={() => handleCopy(serverRedirectUri)}
                disabled={loading || !serverRedirectUri}
                className="p-3 text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800 mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Important Note:</p>
                  <p className="mt-1">
                    Google is extremely strict. If you use both the <strong>Dev</strong> and <strong>Shared</strong> links, you must add the <code>/auth/callback</code> URL for <strong>BOTH</strong> domains to your Google Cloud Console.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
              <h4 className="font-semibold mb-2 flex items-center">
                Troubleshooting for <span className="font-mono text-xs ml-1 bg-blue-100 px-1 rounded">oshc1987.accreditation@gmail.com</span>:
              </h4>
              <ol className="list-decimal list-inside space-y-2 ml-1">
                <li>
                  <strong>Fix 400 Redirect URI Mismatch:</strong> 
                  <p className="mt-1 ml-4">
                    Copy the URL above and add it to your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>.
                  </p>
                </li>
                <li><strong>Fix 403 Access Denied:</strong> Ensure your email is added as a <strong>Test User</strong> in the <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">OAuth Consent Screen</a>.</li>
                <li><strong>Enable Calendar API:</strong> Ensure "Google Calendar API" is enabled in your project.</li>
                <li><strong>Environment Variables:</strong> Ensure <code className="bg-blue-100 px-1 rounded">OAUTH_CLIENT_ID</code> and <code className="bg-blue-100 px-1 rounded">OAUTH_CLIENT_SECRET</code> are set and have no extra spaces.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
