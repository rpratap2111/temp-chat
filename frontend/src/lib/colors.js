// Stable per-person colours, so each name keeps the same avatar and name colour.
// These are the only hues in the chat, because here colour means who is talking.
// Orange is left out so nobody is mistaken for the ember accent.

export const AVATAR_COLORS = [
    'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    'bg-pink-500/15 text-pink-700 dark:text-pink-300',
    'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
    'bg-lime-500/15 text-lime-800 dark:text-lime-300',
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    'bg-blue-500/15 text-blue-700 dark:text-blue-300',
];

export const NAME_COLORS = [
    'text-rose-700 dark:text-rose-300',
    'text-pink-700 dark:text-pink-300',
    'text-yellow-800 dark:text-yellow-300',
    'text-lime-800 dark:text-lime-300',
    'text-emerald-700 dark:text-emerald-300',
    'text-teal-700 dark:text-teal-300',
    'text-sky-700 dark:text-sky-300',
    'text-blue-700 dark:text-blue-300',
];

export function colorIndex(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return hash % AVATAR_COLORS.length;
}
