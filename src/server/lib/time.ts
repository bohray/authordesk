/**
 * Duration units in milliseconds. Pure (no `server-only`) so the pure AI fact builders and
 * unit tests can import it too.
 */
export const msPerSecond = 1000;
export const msPerMinute = 60 * msPerSecond;
export const msPerHour = 60 * msPerMinute;
export const msPerDay = 24 * msPerHour;
export const secondsPerHour = msPerHour / msPerSecond;
export const secondsPerDay = msPerDay / msPerSecond;
