// src/components/forms/StandaloneFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DynamicForm from '../DynamicForm';
import { fetchPublicDynamicFormConfig } from '../../utils/dynamicFormConfigs';
import { CARD_THEMES } from '../../utils/cardTheme';
import { showToast } from '../../utils/toast';

export const StandaloneFormPage = ({ user, userRoles = [], formUuid = null }) => {
  const params = useParams();
  const navigate = useNavigate();
  const formName = formUuid || params.formName;

  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadFormMeta = async () => {
      if (!formName) {
        setLoading(false);
        setError('No form name specified');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const config = await fetchPublicDynamicFormConfig(formName);
        if (!isMounted) return;

        if (config) {
          setFormConfig(config);
          document.title = `${config.display_name || formName} | Madrasa Rahmaniya Quasimul Uloom Educational and Charitable Trust`;
        } else {
          setError(`The requested form "${formName}" was not found or is currently unavailable.`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load standalone form:', err);
        setError(`Failed to load form "${formName}": ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFormMeta();

    return () => {
      isMounted = false;
    };
  }, [formName]);

  const handleCopyLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      showToast('Form link copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const themeName = formConfig?.card_theme || 'blueDark';
  const themeObj = CARD_THEMES[themeName] || CARD_THEMES.blueDark;
  const themeTextColor = themeObj?.color ? `text-${themeObj.color}` : 'text-blue-600';

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-850 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl border-4 border-rose-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-400">Loading form schema...</p>
          </div>
        ) : error || !formConfig ? (
          <div className="bg-slate-900/70 border border-red-500/20 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fas fa-file-circle-xmark" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mb-2">Form Not Found</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {error || `The form "${formName}" does not exist or may have been removed.`}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Form Header Card */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500/20 to-amber-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl shrink-0">
                    <i className={`fas ${formConfig.icon || 'fa-clipboard-list'}`} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
                      {formConfig.display_name || formConfig.form_name}
                    </h1>
                    {formConfig.description && (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                        {formConfig.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer shrink-0"
                  title="Copy form link"
                >
                  <i className="fas fa-link text-[11px]" />
                  <span className="hidden sm:inline">Copy Link</span>
                </button>
              </div>
            </div>

            {/* Embed Dynamic Form */}
            <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-2xl text-slate-800 border border-slate-200">
              <DynamicForm
                uuid={formName}
                isDirectLink={true}
                textColor={themeTextColor}
                userRoles={userRoles}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full border-t border-white/5 bg-slate-950/60 py-6 px-4 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} Madrasa Rahmaniya Quasimul Uloom Educational and Charitable
          Trust. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default StandaloneFormPage;
