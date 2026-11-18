import React, { useState } from 'react';
import { Award, Heart, ImageIcon, Shield, UserCheck, Users } from 'lucide-react';
import { PlayerProfile } from '../types';

interface PlayerProfileCardProps {
  profile: PlayerProfile;
  onChangeUid?: () => void;
  compact?: boolean;
}

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
  profile,
  onChangeUid,
  compact = false,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {profile.avatarUrl && !avatarFailed ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.nickname} Free Fire avatar`}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={() => setAvatarFailed(true)}
              className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white min-w-0">
              <span className="truncate">{profile.nickname}</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium shrink-0">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular truncate">
              UID {profile.uid}
              {profile.region ? ` · ${profile.region}` : ''}
              {typeof profile.level === 'number' ? ` · Lvl ${profile.level}` : ''}
              {profile.rankTier ? ` · ${profile.rankTier}` : ''}
            </p>
          </div>
        </div>

        {onChangeUid && (
          <button
            type="button"
            onClick={onChangeUid}
            className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            Change UID
          </button>
        )}
      </div>

      {!compact && (
        <>
          {(profile.guildName ||
            profile.guildId ||
            profile.avatarId ||
            typeof profile.likes === 'number' ||
            typeof profile.badgeCount === 'number' ||
            profile.lastLoginAt) && (
            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
              {profile.guildName && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0">
                  <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">
                    Guild: <strong className="font-semibold">{profile.guildName}</strong>
                  </span>
                </div>
              )}
              {profile.guildId && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono-tabular min-w-0">
                  <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Guild ID: {profile.guildId}</span>
                </div>
              )}
              {profile.avatarId && !profile.avatarUrl && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono-tabular min-w-0">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Avatar ID: {profile.avatarId}</span>
                </div>
              )}
              {typeof profile.likes === 'number' && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono-tabular min-w-0">
                  <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Likes: {profile.likes.toLocaleString('en-PK')}</span>
                </div>
              )}
              {typeof profile.badgeCount === 'number' && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono-tabular min-w-0">
                  <Award className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="truncate">Badges: {profile.badgeCount}</span>
                </div>
              )}
              {profile.lastLoginAt && (
                <div className="text-slate-500 dark:text-slate-400 font-mono-tabular truncate">
                  Last Seen:{' '}
                  {/^\d{9,11}$/.test(profile.lastLoginAt)
                    ? new Date(Number(profile.lastLoginAt) * 1000).toLocaleDateString('en-PK', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : profile.lastLoginAt}
                </div>
              )}
            </div>
          )}

          {profile.signature && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic break-words">
              "{profile.signature}"
            </p>
          )}

          {profile.extraFields && profile.extraFields.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 min-[360px]:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {profile.extraFields.map((field) => (
                <div key={field.label} className="truncate text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">{field.label}: </span>
                  <span className="font-mono-tabular">{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
