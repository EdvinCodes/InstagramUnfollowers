import React, { useRef } from 'react';
import { t } from '../i18n/i18n';
import type { MetaExportUser } from '../utils/metaExportParser';
import { classifyMetaConnectionsFile, dedupeMetaUsers, parseMetaUserList } from '../utils/metaExportParser';

interface MetaImportViewProps {
  onImported: (following: MetaExportUser[], followers: MetaExportUser[]) => void;
  onBack: () => void;
  onShowToast: (message: string, style?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const MetaImportView = ({ onImported, onBack, onShowToast }: MetaImportViewProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const following: MetaExportUser[] = [];
    const followers: MetaExportUser[] = [];

    try {
      for (const file of Array.from(fileList)) {
        const text = await file.text();
        const kind = classifyMetaConnectionsFile(file.name, text);
        const users = parseMetaUserList(text);
        if (kind === 'following') {
          following.push(...users);
        } else if (kind === 'followers') {
          followers.push(...users);
        }
      }
    } catch {
      onShowToast(t('metaParseError'), 'error');
      return;
    }

    if (following.length === 0 || followers.length === 0) {
      onShowToast(t('metaNeedBoth'), 'warning');
      return;
    }

    onImported(dedupeMetaUsers(following), dedupeMetaUsers(followers));
  };

  return (
    <div className='empty-state-container pending-setup'>
      <h2 className='empty-state-title' style={{ fontSize: '1.7rem' }}>
        {t('metaTitle')}
      </h2>
      <p className='pending-setup-lead'>{t('metaDescription')}</p>
      <div className='pending-how'>
        <h3>{t('metaHowTitle')}</h3>
        <ol>
          <li>{t('metaHow1')}</li>
          <li>{t('metaHow2')}</li>
          <li>{t('metaHow3')}</li>
          <li>{t('metaHow4')}</li>
        </ol>
        <p className='pending-how-note'>{t('metaHowNote')}</p>
      </div>
      <input
        ref={fileRef}
        type='file'
        accept='.html,.json,.txt'
        multiple
        hidden
        onChange={event => {
          void handleFiles(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />
      <button type='button' className='run-scan-btn pending-upload-btn' onClick={() => fileRef.current?.click()}>
        {t('metaUploadBtn')}
      </button>
      <button type='button' className='btn pending-back-btn' onClick={onBack}>
        {t('metaBack')}
      </button>
    </div>
  );
};
