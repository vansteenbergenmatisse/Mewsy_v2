import React from 'react';

// ── Shared Mewsie logo SVG ─────────────────────────────────────────────────────
// Used in: BotAvatar, ChatHeader, Sidebar
// Accepts a className prop so callers can size/style it independently.

interface MewsieLogoProps {
  className?: string;
  width?: number;
  height?: number;
  stylePrefix?: string; // unique prefix for the inline <style> class names to avoid collisions
}

export function MewsieLogo({ className, width = 28, height = 28, stylePrefix = 'ml' }: MewsieLogoProps) {
  const s0 = `${stylePrefix}st0`;
  const s1 = `${stylePrefix}st1`;
  const s2 = `${stylePrefix}st2`;
  const s3 = `${stylePrefix}st3`;
  return (
    <svg className={className} viewBox="0 0 194.9 194.9" xmlns="http://www.w3.org/2000/svg" width={width} height={height}>
      <style>{`.${s0}{fill:#3277A5;}.${s1}{fill:#FFFFFF;}.${s2}{fill:#EC6945;}.${s3}{fill:#F6A03C;}`}</style>
      <g>
        <path className={s0} d="M166.4,28.6c-38.1-38.1-99.8-38.1-137.9,0C5.3,51.8-3.8,83.9,1.4,114c6.4-3.2,14.4-1.7,19.2,4.1c0.2,0.2,0.3,0.4,0.4,0.6c2.5-0.8,5.1-1.2,7.5-1.2c11.9,0,21.7,9.2,22.7,20.8c2-0.6,4.1-0.9,6.2-0.9c5,0,9.7,1.8,13.5,4.8c6.7,3.1,11.4,9.9,11.4,17.8c0,3.4-0.9,6.5-2.3,9.3c4,3.1,6.6,8,6.6,13.5c0,4.2-1.5,8.1-4.1,11.1c29.6,4.5,60.9-4.6,83.7-27.4C204.4,128.3,204.4,66.6,166.4,28.6z"/>
        <polygon className={s1} points="46.1,177.5 15.6,147.8 109,78 118,87"/>
        <path className={s2} d="M113.6,81.9c11.8,11.8,14.5,28.8,7.3,40.8c4.6-1.7,8.8-4.3,12.4-7.9c13.9-13.9,13.4-36.8-1.1-51.3S94.8,48.5,81,62.4c-3.5,3.5-6.1,7.6-7.8,12C85.1,67.5,101.9,70.3,113.6,81.9z"/>
        <path className={s2} d="M177.9,42.6c9-18.3,8.1-31.8,8.1-31.8S172.8,9,153.9,18c4.1,3.9,8.2,7.9,12.3,12.1C170.2,34.3,174.1,38.4,177.9,42.6z"/>
        <path className={s3} d="M166.4,28.6c-3.9-3.9-8.1-7.4-12.5-10.6c-8.3,4.2-17.7,10.6-27.5,20.3C113,51.6,103.5,65.6,99.3,76.8c4,2.1,7.8,4.9,11.3,8.4c3.6,3.6,6.4,7.5,8.6,11.7c11.5-4.3,25.8-14.1,39.3-27.7c9.3-9.3,15.4-18.4,19.5-26.7C174.6,37.6,170.7,32.9,166.4,28.6z"/>
        <path className={s2} d="M119.5,83.1C105.1,97.4,97.7,98,97.7,98s0.8-7.6,14.9-21.8c13.3-13.3,21.8-14.9,21.8-14.9S133.1,69.4,119.5,83.1z"/>
        <circle className={s0} cx="152.2" cy="43.5" r="12.9"/>
        <circle className={s1} cx="152.2" cy="43.5" r="9.2"/>
        <path className={s1} d="M80.1,169.2c1.5-2.8,2.3-5.9,2.3-9.3c0-7.9-4.7-14.7-11.4-17.8c-3.8-3-8.4-4.7-13.5-4.8c-2.2,0-4.2,0.3-6.2,0.9c-1-11.6-10.8-20.8-22.7-20.8c-2.4,0-5,0.4-7.5,1.2c-0.2-0.2-0.3-0.4-0.4-0.6c-4.8-5.7-12.7-7.2-19.2-4.1c3.3,19.2,12.3,37.6,27.1,52.4c15.3,15.3,34.3,24.4,54.1,27.4c2.5-3,4-6.8,4-11.1C86.7,177.2,84.1,172.4,80.1,169.2z"/>
      </g>
    </svg>
  );
}
