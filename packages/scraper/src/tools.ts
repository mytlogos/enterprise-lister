import { TocEpisode, TocPart, TocContent } from "./externals/types";

/**
 * Returns true if the value is a TocEpisode.
 *
 * @param tocContent value to check
 */
export function isTocEpisode(tocContent: TocContent): tocContent is TocEpisode {
  // @ts-expect-error
  return !!tocContent.url;
}

/**
 * Returns true if the value is a TocPart.
 *
 * @param tocContent value to check
 */
export function isTocPart(tocContent: TocContent): tocContent is TocPart {
  // @ts-expect-error
  return !!tocContent.episodes;
}
