import { TocEpisode, TocPart, TocContent } from "./externals/types";

/**
 * Returns true if the value is a TocEpisode.
 *
 * @param tocContent value to check
 */
export function isTocEpisode(tocContent: TocContent): tocContent is TocEpisode {
  return "url" in tocContent;
}

/**
 * Returns true if the value is a TocPart.
 *
 * @param tocContent value to check
 */
export function isTocPart(tocContent: TocContent): tocContent is TocPart {
  return "episodes" in tocContent;
}
