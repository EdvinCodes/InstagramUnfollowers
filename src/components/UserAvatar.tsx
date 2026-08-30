import React, { useState } from 'react';

interface UserAvatarProps {
  username: string;
  src?: string | null;
  className?: string;
}

export function UserAvatar({ username, src, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const letter = (username.trim()[0] || '#').toUpperCase();
  const classes = ['avatar', className].filter(Boolean).join(' ');

  if (!src || failed) {
    return (
      <div className={`${classes} avatar-letter`} aria-hidden='true'>
        {letter}
      </div>
    );
  }

  return (
    <img className={classes} alt='' src={src} loading='lazy' onError={() => setFailed(true)} />
  );
}
