'use client';

import React, { useSyncExternalStore } from 'react';
import { formatDistanceToNow } from 'date-fns';

const emptySubscribe = () => () => {};

export default function TimeAgo({ 
  date, 
  addSuffix = true 
}: { 
  date: string | Date; 
  addSuffix?: boolean 
}) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    if (typeof date === 'string' && date.includes('T')) {
      return <span>{date.split('T')[0]}</span>;
    }
    return <span>Just now</span>;
  }

  let formatted = 'Just now';
  try {
    formatted = formatDistanceToNow(new Date(date), { addSuffix });
  } catch {
    formatted = 'Just now';
  }

  return <span>{formatted}</span>;
}

