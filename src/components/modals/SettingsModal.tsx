import { useState, useEffect } from 'react';
import { ExternalLink, Smartphone, FlaskConical, Sun, Moon, BookOpen, Anchor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useBookmarks } from '../../hooks/useBookmarks';
import { clearUserValues } from '../../hooks/useUserValues';
import { batchExport } from '../../lib/obsidian';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import TokenManager from '../settings/TokenManager';
import FeedbackList from '../settings/FeedbackList';

// TEMP: surfaces the viewport numbers the device actually reports, so the iOS
// bottom-bar dead zone (overhaul finding #9) can be diagnosed from a screenshot.
function ViewportDiagnostics() {
  const [info, setInfo] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInfo({
      standalone: String(standalone),
      'fullbleed mode': String(document.documentElement.classList.contains('vp-fullbleed')),
      'window.innerHeight': String(window.innerHeight),
      'html.clientHeight': String(document.documentElement.clientHeight),
      'visualViewport.height': String(Math.round(window.visualViewport?.height ?? 0)),
      'screen.height': String(screen.height),
      'safe-area top / bottom': `${cs.paddingTop} / ${cs.paddingBottom}`,
    });
    document.body.removeChild(probe);
  }, []);

  if (!info) return null;
  return (
    <section className="pt-2 border-t border-surface-200 dark:border-surface-800">
      <h3 className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1.5">
        Viewport diagnostics (temporary)
      </h3>
      <dl className="font-mono text-[11px] leading-relaxed text-surface-500 dark:text-surface-400">
        {Object.entries(info).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt>{k}</dt>
            <dd className="text-surface-700 dark:text-surface-200">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  onSignOut: () => void;
  isDemo?: boolean;
}

export default function SettingsModal({
  open,
  onClose,
  userEmail,
  onSignOut,
  isDemo,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'feedback'>('general');
  const { theme, setTheme } = useTheme();
  const [aiKey, setAiKey] = useState(() => localStorage.getItem('openrouter_key') ?? '');
  const [ytKey, setYtKey] = useState(() => localStorage.getItem('youtube_api_key') ?? '');
  const [obsidianVault, setObsidianVault] = useState(
    () => localStorage.getItem('obsidian_vault') ?? '',
  );
  const [obsidianVaultFolder, setObsidianVaultFolder] = useState(
    () => localStorage.getItem('obsidian_vault_folder') ?? 'ContentDeck',
  );
  const [autoExport, setAutoExport] = useState(
    () => localStorage.getItem('obsidian_auto_export') === 'true',
  );
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(
    null,
  );

  const { bookmarks, markSynced } = useBookmarks();
  const doneUnsynced = bookmarks.filter((b) => b.status === 'done' && !b.synced);
  const hasDirectoryPicker = 'showDirectoryPicker' in window;

  // Save keys to localStorage on change
  useEffect(() => {
    if (aiKey) localStorage.setItem('openrouter_key', aiKey);
    else localStorage.removeItem('openrouter_key');
  }, [aiKey]);

  useEffect(() => {
    if (ytKey) localStorage.setItem('youtube_api_key', ytKey);
    else localStorage.removeItem('youtube_api_key');
  }, [ytKey]);

  useEffect(() => {
    if (obsidianVault) localStorage.setItem('obsidian_vault', obsidianVault);
    else localStorage.removeItem('obsidian_vault');
  }, [obsidianVault]);

  useEffect(() => {
    localStorage.setItem('obsidian_vault_folder', obsidianVaultFolder || 'ContentDeck');
  }, [obsidianVaultFolder]);

  useEffect(() => {
    if (autoExport) localStorage.setItem('obsidian_auto_export', 'true');
    else localStorage.removeItem('obsidian_auto_export');
  }, [autoExport]);

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md">
      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1 mb-6">
        {(['general', 'feedback'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] capitalize
              ${
                activeTab === tab
                  ? 'bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
          >
            {tab === 'general' ? 'General' : 'Feedback'}
          </button>
        ))}
      </div>

      {activeTab === 'feedback' ? (
        <FeedbackList />
      ) : (
        <div className="space-y-6">
          {/* Account / Demo Notice */}
          {isDemo ? (
            <section className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex items-start gap-3">
                <FlaskConical
                  size={20}
                  className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Demo Mode
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    You're exploring with sample data. Sign in to save your own bookmarks.
                  </p>
                  <Button variant="secondary" size="sm" onClick={onSignOut}>
                    Sign In
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">
                Account
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="block text-xs text-surface-500 dark:text-surface-400 mb-1">Email</p>
                  <div className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm text-surface-600 dark:text-surface-400 truncate">
                    {userEmail ?? 'Unknown'}
                  </div>
                </div>
                <Button variant="danger" onClick={onSignOut} className="mt-2">
                  Sign Out
                </Button>
              </div>
            </section>
          )}

          {/* Theme */}
          <section>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">
              Theme
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { key: 'light', label: 'Light', icon: Sun },
                  { key: 'dark', label: 'Dark', icon: Moon },
                  { key: 'sepia', label: 'Sepia', icon: BookOpen },
                  { key: 'navy', label: 'Navy', icon: Anchor },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors min-h-[56px] ${
                    theme === key
                      ? 'border-primary-500 bg-primary-600/10 text-primary-700 dark:text-primary-300'
                      : 'border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-600'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Save from Your Phone */}
          <section>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2 flex items-center gap-2">
              <Smartphone size={16} />
              Save from Your Phone
            </h3>
            <div className="space-y-3 text-xs text-surface-600 dark:text-surface-400">
              <div className="rounded-lg bg-surface-50 dark:bg-surface-800/50 p-3 space-y-2">
                <p className="font-medium text-surface-700 dark:text-surface-300">Install as App</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    <strong>Android:</strong> Chrome menu → "Install app"
                  </li>
                  <li>
                    <strong>iOS:</strong> Safari → Share → "Add to Home Screen"
                  </li>
                </ul>
                <p className="text-surface-500 dark:text-surface-500 pt-1">
                  After installing, share any URL from any app → pick ContentDeck from the share
                  sheet.
                </p>
              </div>
              <p className="text-surface-500 dark:text-surface-500">
                Or just tap <strong>+</strong> in the app and paste any URL.
              </p>
            </div>
          </section>

          {/* API Tokens (bookmarklet/iOS Shortcut) — hidden in demo mode */}
          {!isDemo && <TokenManager />}

          {/* API Keys */}
          <section>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">
              API Keys
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="settings-ai-key"
                  className="block text-xs text-surface-500 dark:text-surface-400 mb-1"
                >
                  OpenRouter API Key <span className="text-surface-400">(for AI tagging)</span>
                </label>
                <input
                  id="settings-ai-key"
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-base min-h-[44px]"
                />
              </div>
              <div>
                <label
                  htmlFor="settings-yt-key"
                  className="block text-xs text-surface-500 dark:text-surface-400 mb-1"
                >
                  YouTube API Key{' '}
                  <span className="text-surface-400">(optional, for extended metadata)</span>
                </label>
                <input
                  id="settings-yt-key"
                  type="password"
                  value={ytKey}
                  onChange={(e) => setYtKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-base min-h-[44px]"
                />
              </div>
            </div>
          </section>

          {/* Obsidian */}
          <section>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">
              Obsidian Export
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="settings-vault"
                  className="block text-xs text-surface-500 dark:text-surface-400 mb-1"
                >
                  Vault Name{' '}
                  <span className="text-surface-400">
                    (exact name shown in Obsidian, e.g. MyVault)
                  </span>
                </label>
                <input
                  id="settings-vault"
                  type="text"
                  value={obsidianVault}
                  onChange={(e) => setObsidianVault(e.target.value)}
                  placeholder="ContentDeck"
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-base min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-vault-folder"
                  className="block text-xs text-surface-500 dark:text-surface-400 mb-1"
                >
                  Vault Folder{' '}
                  <span className="text-surface-400">
                    (subfolder inside vault, e.g. ContentDeck)
                  </span>
                </label>
                <input
                  id="settings-vault-folder"
                  type="text"
                  value={obsidianVaultFolder}
                  onChange={(e) => setObsidianVaultFolder(e.target.value || 'ContentDeck')}
                  placeholder="ContentDeck"
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-base min-h-[44px]"
                />
              </div>

              {obsidianVault && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={autoExport}
                      onChange={(e) => setAutoExport(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                    <span className="text-xs text-surface-700 dark:text-surface-300">
                      Auto-export to Obsidian when marking done
                    </span>
                  </label>

                  <div className="space-y-1.5">
                    {doneUnsynced.length > 0 && (
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {doneUnsynced.length} item{doneUnsynced.length !== 1 ? 's' : ''} done, not
                        yet synced
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={doneUnsynced.length === 0 || exportProgress !== null}
                      onClick={async () => {
                        setExportProgress({ current: 0, total: doneUnsynced.length });
                        const result = await batchExport(
                          doneUnsynced,
                          obsidianVaultFolder,
                          (current, total) => setExportProgress({ current, total }),
                        );
                        setExportProgress(null);
                        if (result.exported > 0) {
                          for (const b of doneUnsynced) markSynced.mutate(b.id);
                        }
                      }}
                    >
                      {exportProgress
                        ? `Exporting ${exportProgress.current}/${exportProgress.total}...`
                        : hasDirectoryPicker
                          ? 'Export All Done'
                          : 'Copy All Done as Markdown'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Reading values */}
          {localStorage.getItem('contentdeck_values') && (
            <section>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">
                Personalization
              </h3>
              <div className="flex items-center justify-between min-h-[44px]">
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  Reading values configured
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearUserValues();
                    window.dispatchEvent(new Event('storage'));
                  }}
                >
                  Reset
                </Button>
              </div>
            </section>
          )}

          {/* TEMP: viewport diagnostics for the iOS bottom-bar dead-zone investigation
              (overhaul finding #9). Remove once the mobile nav fix is confirmed on device. */}
          <ViewportDiagnostics />

          {/* Info */}
          <section className="pt-2 border-t border-surface-200 dark:border-surface-800">
            <div className="flex items-center justify-between text-xs text-surface-400 dark:text-surface-500">
              <span>ContentDeck v3.11.1</span>
              <a
                href="https://github.com/aditya30103/ContentDeck"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-surface-600 dark:hover:text-surface-300"
              >
                GitHub <ExternalLink size={12} />
              </a>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
