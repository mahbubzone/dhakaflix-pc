/** Shared IPC validation: movie ids are positive integers. */
export function isValidMovieId(movieId: unknown): movieId is number {
  return Number.isInteger(movieId) && (movieId as number) > 0;
}
