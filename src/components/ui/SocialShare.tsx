'use client';

import React, { useState } from 'react';
import { Linkedin, Twitter, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SocialShareProps {
  /** Page URL to share (defaults to current page URL) */
  url?: string;
  /** Course title for pre-filled text */
  courseTitle?: string;
  /** Size of buttons */
  size?: 'sm' | 'md' | 'lg';
  /** Show as icon-only or with text */
  variant?: 'icon' | 'label';
  /** Custom CSS class */
  className?: string;
}

export function SocialShare({
  url,
  courseTitle = 'a course',
  size = 'md',
  variant = 'label',
  className,
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  // Get current page URL if not provided
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(shareUrl);

  const linkedInText = `I just completed ${courseTitle} on Hamplard!`;
  const twitterText = `I just completed ${courseTitle} on Hamplard! ${shareUrl} #Hamplard`;
  const encodedLinkedInText = encodeURIComponent(linkedInText);
  const encodedTwitterText = encodeURIComponent(twitterText);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleLinkedInShare = () => {
    if (!shareUrl) return;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400',
    );
  };

  const handleTwitterShare = () => {
    if (!shareUrl) return;
    window.open(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTwitterText}`,
      '_blank',
      'noopener,noreferrer,width=550,height=420',
    );
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonClass = cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hamplard-primary',
    'hover:scale-105 active:scale-95',
    sizeClasses[size],
  );

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {/* LinkedIn Share Button */}
      <button
        type="button"
        onClick={handleLinkedInShare}
        aria-label="Share on LinkedIn"
        className={cn(
          buttonClass,
          'bg-[#0A66C2] text-white hover:bg-[#084399]',
        )}
      >
        <Linkedin className={iconSizes[size]} aria-hidden="true" />
        {variant === 'label' && <span>LinkedIn</span>}
      </button>

      {/* Twitter/X Share Button */}
      <button
        type="button"
        onClick={handleTwitterShare}
        aria-label="Share on Twitter"
        className={cn(
          buttonClass,
          'bg-black text-white hover:bg-ink-900',
        )}
      >
        <Twitter className={iconSizes[size]} aria-hidden="true" />
        {variant === 'label' && <span>X</span>}
      </button>

      {/* Copy Link Button */}
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={copied ? 'Link copied' : 'Copy share link'}
        className={cn(
          buttonClass,
          copied
            ? 'bg-leaf-100 text-leaf-700'
            : 'bg-ink-100 text-ink-700 hover:bg-ink-200',
        )}
      >
        {copied ? (
          <>
            <CheckCircle2 className={iconSizes[size]} aria-hidden="true" />
            {variant === 'label' && <span>Copied!</span>}
          </>
        ) : (
          <>
            <LinkIcon className={iconSizes[size]} aria-hidden="true" />
            {variant === 'label' && <span>Copy link</span>}
          </>
        )}
      </button>
    </div>
  );
}

export default SocialShare;
