import React, { useState } from 'react';

interface UserAvatarProps {
  username: string;
  src?: string | null;
  className?: string;
}

const PREVIEW_SIZE = 160;

export function UserAvatar({ username, src, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const letter = (username.trim()[0] || '#').toUpperCase();
  const classes = ['avatar', className].filter(Boolean).join(' ');

  // `position: fixed` (not absolute) is what makes this escape the row's
  // `overflow: hidden` ancestors — it's positioned against the viewport, same
  // coordinate space `getBoundingClientRect()` reports in, so no extra JS is
  // needed to keep it aligned even inside the extension's shadow DOM.
  const showPreview = (target: Element) => {
    if (!src || failed) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const left = Math.min(rect.right + 10, window.innerWidth - PREVIEW_SIZE - 10);
    const top = Math.min(Math.max(8, rect.top - 20), window.innerHeight - PREVIEW_SIZE - 10);
    setPreviewPos({ top, left });
  };
  const hidePreview = () => setPreviewPos(null);

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showPreview(e.currentTarget),
    onMouseLeave: hidePreview,
  };

  if (!src || failed) {
    return (
      <div className={`${classes} avatar-letter`} aria-hidden='true' {...hoverHandlers}>
        {letter}
      </div>
    );
  }

  return (
    <>
      <img className={classes} alt='' src={src} loading='lazy' onError={() => setFailed(true)} {...hoverHandlers} />
      {previewPos && (
        <img
          className='avatar-hover-preview'
          src={src}
          alt=''
          aria-hidden='true'
          style={{ top: `${previewPos.top}px`, left: `${previewPos.left}px` }}
        />
      )}
    </>
  );
}
