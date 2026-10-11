// Stable per-person colours, so each name keeps the same avatar and name colour.

export const AVATAR_COLORS = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500',
];

export const NAME_COLORS = [
    'text-rose-600 dark:text-rose-400', 'text-orange-600 dark:text-orange-400',
    'text-amber-600 dark:text-amber-400', 'text-emerald-600 dark:text-emerald-400',
    'text-teal-600 dark:text-teal-400', 'text-sky-600 dark:text-sky-400',
    'text-violet-600 dark:text-violet-400', 'text-fuchsia-600 dark:text-fuchsia-400',
];

export function colorIndex(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return hash % AVATAR_COLORS.length;
}
