/**
 * Quota management page - coordinates the three quota sections.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useAuthStore } from '@/stores';
import { authFilesApi, configFileApi } from '@/services/api';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  QuotaSection,
  ANTIGRAVITY_CONFIG,
  CODEX_CONFIG,
  GEMINI_CLI_CONFIG,
} from '@/components/quota';
import type { AuthFileItem } from '@/types';
import styles from './QuotaPage.module.scss';

export function QuotaPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const [files, setFiles] = useState<AuthFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [authPriority, setAuthPriority] = useState<Record<string, number>>({});
  const [authPriorityError, setAuthPriorityError] = useState<'unsupported' | null>(null);
  const [sortByPriority, setSortByPriority] = useState(true);
  const authPriorityUnsupportedRef = useRef(false);

  const disableControls = connectionStatus !== 'connected';

  const loadConfig = useCallback(async () => {
    try {
      await configFileApi.fetchConfigYaml();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('notification.refresh_failed');
      setError((prev) => prev || errorMessage);
    }
  }, [t]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFilesApi.list();
      setFiles(data?.files || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('notification.refresh_failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadAuthPriority = useCallback(async () => {
    try {
      const res = await authFilesApi.getAuthPriority();
      authPriorityUnsupportedRef.current = false;
      setAuthPriority(res || {});
      setAuthPriorityError(null);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: unknown }).status
          : undefined;

      if (status === 404) {
        setAuthPriority({});
        setAuthPriorityError('unsupported');
        if (!authPriorityUnsupportedRef.current) {
          authPriorityUnsupportedRef.current = true;
        }
      }
    }
  }, []);

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([loadConfig(), loadFiles(), loadAuthPriority()]);
  }, [loadConfig, loadFiles, loadAuthPriority]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    loadFiles();
    loadConfig();
    loadAuthPriority();
  }, [loadFiles, loadConfig, loadAuthPriority]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('quota_management.title')}</h1>
        <p className={styles.description}>{t('quota_management.description')}</p>
        {authPriorityError !== 'unsupported' && (
          <div className={styles.sortToggle}>
            <ToggleSwitch
              checked={sortByPriority}
              onChange={setSortByPriority}
              label={t('quota_management.sort_by_priority')}
            />
          </div>
        )}
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <QuotaSection
        config={ANTIGRAVITY_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        authPriority={authPriority}
        sortByPriority={sortByPriority}
      />
      <QuotaSection
        config={CODEX_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        authPriority={authPriority}
        sortByPriority={sortByPriority}
      />
      <QuotaSection
        config={GEMINI_CLI_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        authPriority={authPriority}
        sortByPriority={sortByPriority}
      />
    </div>
  );
}
