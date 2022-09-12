import { SubContext } from "./subContext";
import {
  FullMediumToc,
  LikeMedium,
  LikeMediumQuery,
  Medium,
  SimpleMedium,
  Synonyms,
  TocSearchMedium,
  UpdateMedium,
  Uuid,
  SecondaryMedium,
  VoidablePromise,
  EmptyPromise,
  PromiseMultiSingle,
  MultiSingleValue,
  MultiSingleNumber,
  MediumToc,
  TypedQuery,
  Id,
} from "../../types";
import { count, getElseSet, isInvalidId, multiSingle, promiseMultiSingle } from "../../tools";
import { escapeLike } from "../storages/storageTools";
import { storeModifications } from "../sqlTools";
import { DatabaseError, MissingEntityError, ValidationError } from "../../error";

export class MediumContext extends SubContext {
  public async getSpecificToc(id: number, link: string): VoidablePromise<FullMediumToc> {
    const tocs = await this.select<FullMediumToc>(
      `SELECT
       id, medium_id as mediumId, link,
       countryOfOrigin as "countryOfOrigin", languageOfOrigin as "languageOfOrigin",
       author, title,medium, artist, lang, stateOrigin as "stateOrigin",
       stateTL as "stateTL", series, universe
       FROM medium_toc WHERE medium_id = ? AND link = ?;`,
      [id, link],
    );
    return tocs[0];
  }

  public async removeToc(tocLink: string): EmptyPromise {
    const result: any[] = await this.select("SELECT medium_id FROM medium_toc WHERE link = ?", tocLink);
    await Promise.all(
      result.map((value) => {
        return this.removeMediumToc(value.medium_id, tocLink);
      }),
    );
  }

  /**
   * Adds a medium to the storage.
   */
  public async addMedium(medium: SimpleMedium, uuid?: Uuid): Promise<SimpleMedium> {
    if (!medium?.medium || !medium?.title) {
      return Promise.reject(new ValidationError(`Invalid Medium: ${medium?.title}-${medium?.medium}`));
    }
    const result = await this.query("INSERT INTO medium(medium, title) VALUES (?,?) RETURNING id;", [
      medium.medium,
      medium.title,
    ]);
    const id = result.rows[0]?.id;
    if (!Number.isInteger(id)) {
      throw new DatabaseError(`insert failed, invalid ID: ${id + ""}`);
    }
    storeModifications("medium", "insert", result);

    await this.parentContext.partContext.createStandardPart(id);

    const newMedium = {
      ...medium,
      id,
    };

    // if it should be added to an list, do it right away
    if (uuid) {
      // add item to listId of medium or the standard list
      await this.parentContext.internalListContext.addItemToList(newMedium, uuid);
    }
    return newMedium;
  }

  public getSimpleMedium<T extends MultiSingleNumber>(id: T): PromiseMultiSingle<T, SimpleMedium> {
    // TODO: 29.06.2019 replace with id IN (...)
    return promiseMultiSingle(id, async (mediumId) => {
      const resultArray: any[] = await this.select("SELECT * FROM medium WHERE medium.id=?;", mediumId);
      const result = resultArray[0];

      if (!result) {
        throw new MissingEntityError(`Medium with id ${mediumId} does not exist`);
      }
      return {
        id: result.id,
        countryOfOrigin: result.countryoforigin,
        languageOfOrigin: result.languageoforigin,
        author: result.author,
        title: result.title,
        medium: result.medium,
        artist: result.artist,
        lang: result.lang,
        stateOrigin: result.stateorigin,
        stateTL: result.statetl,
        series: result.series,
        universe: result.universe,
      };
    });
  }

  public async getTocSearchMedia(): Promise<TocSearchMedium[]> {
    const result = await this.select<{ host?: string; mediumId: number; title: string; medium: number }>(
      // eslint-disable-next-line @typescript-eslint/quotes
      'SELECT substring(episode_release.url, 1, locate("/",episode_release.url,9)) as host, ' +
        "medium.id as mediumId, medium.title, medium.medium " +
        "FROM medium " +
        "LEFT JOIN part ON part.medium_id=medium.id " +
        "LEFT JOIN episode ON part_id=part.id " +
        "LEFT JOIN episode_release ON episode_release.episode_id=episode.id " +
        "GROUP BY mediumId, host;",
    );
    const idMap = new Map<number, TocSearchMedium>();
    const tocSearchMedia = result
      .map((value) => {
        const medium = idMap.get(value.mediumId);
        if (medium) {
          if (medium.hosts && value.host) {
            medium.hosts.push(value.host);
          }
          return false;
        }
        const searchMedium: TocSearchMedium = {
          mediumId: value.mediumId,
          hosts: [],
          synonyms: [],
          medium: value.medium,
          title: value.title,
        };
        if (value.host && searchMedium.hosts) {
          searchMedium.hosts.push(value.host);
        }
        idMap.set(value.mediumId, searchMedium);
        return searchMedium;
      })
      .filter((value) => value) as any[] as TocSearchMedium[];
    const synonyms = await this.getSynonyms(tocSearchMedia.map((value) => value.mediumId));

    synonyms.forEach((value) => {
      const medium = idMap.get(value.mediumId);
      if (!medium) {
        throw new MissingEntityError("missing medium for queried synonyms");
      }

      if (!medium.synonyms) {
        medium.synonyms = [];
      }
      if (Array.isArray(value.synonym)) {
        medium.synonyms.push(...value.synonym);
      } else {
        medium.synonyms.push(value.synonym);
      }
    });
    return tocSearchMedia;
  }

  public async getTocSearchMedium(id: number): Promise<TocSearchMedium> {
    const resultArray: any[] = await this.select("SELECT * FROM medium WHERE medium.id =?;", id);
    const result = resultArray[0];
    const synonyms: Synonyms[] = await this.getSynonyms(id);

    return {
      mediumId: result.id,
      medium: result.medium,
      title: result.title,
      synonyms: synonyms[0]?.synonym || [],
    };
  }

  /**
   * Gets one or multiple media from the storage.
   */
  public getMedium<T extends MultiSingleNumber>(id: T, uuid: Uuid): PromiseMultiSingle<T, Medium> {
    // TODO: 29.06.2019 replace with id IN (...)
    return promiseMultiSingle(id, async (mediumId: number): Promise<Medium> => {
      const result = await this.selectFirst<any>("SELECT * FROM medium WHERE medium.id=?;", mediumId);

      const latestReleasesResult = await this.parentContext.episodeContext.getLatestReleases(mediumId);

      const currentReadResult = await this.selectFirst<any>(
        "SELECT user_episode.episode_id FROM " +
          "(SELECT * FROM user_episode " +
          "WHERE episode_id IN (SELECT id from episode " +
          "WHERE part_id IN (SELECT id FROM part " +
          "WHERE medium_id=?))) as user_episode " +
          "INNER JOIN episode ON user_episode.episode_id=episode.id " +
          "WHERE user_uuid=? " +
          "ORDER BY totalIndex DESC, partialIndex DESC LIMIT 1",
        [mediumId, uuid],
      );
      const unReadResult = await this.select(
        "SELECT episode.id FROM episode WHERE part_id IN (SELECT id FROM part WHERE medium_id=?) " +
          "AND id NOT IN (SELECT episode_id FROM user_episode WHERE user_uuid=?) " +
          "ORDER BY totalIndex DESC, partialIndex DESC;",
        [mediumId, uuid],
      );
      const partsResult = await this.select("SELECT id FROM part WHERE medium_id=?;", mediumId);

      return {
        id: result.id,
        countryOfOrigin: result.countryoforigin,
        languageOfOrigin: result.languageoforigin,
        author: result.author,
        title: result.title,
        medium: result.medium,
        artist: result.artist,
        lang: result.lang,
        stateOrigin: result.stateorigin,
        stateTL: result.statetl,
        series: result.series,
        universe: result.universe,
        parts: partsResult.map((packet: any) => packet.id),
        currentRead: currentReadResult?.episode_id,
        latestReleased: latestReleasesResult.map((packet: any) => packet.id),
        unreadEpisodes: unReadResult.map((packet: any) => packet.id),
      };
    });
  }

  public async getAllMediaFull(): Promise<TypedQuery<SimpleMedium>> {
    return this.queryStream(
      `SELECT 
      id, countryOfOrigin as "countryOfOrigin", languageOfOrigin as "languageOfOrigin",
      author, title, medium, artist, lang, 
      stateOrigin as "stateOrigin", stateTL as "stateTL", series, universe
      FROM medium`,
    );
  }

  public async getAllSecondary(uuid: Uuid): Promise<SecondaryMedium[]> {
    const readStatsPromise = this.select<{ id: number; totalEpisode: number; readEpisodes: number }>(
      "SELECT part.medium_id as id, COUNT(*) as totalEpisodes , COUNT(case when episode.id in (select episode_id from user_episode where ? = user_uuid and progress = 1) then 1 else null end) as readEpisodes " +
        "FROM part " +
        "INNER JOIN episode ON part.id=episode.part_id " +
        "GROUP BY part.medium_id;",
      uuid,
    );
    const tocs = await this.select<FullMediumToc>(
      `SELECT id, medium_id as mediumId, link, countryOfOrigin as "countryOfOrigin",
      languageOfOrigin as "languageOfOrigin", author, title, medium,
      artist, lang, stateOrigin as "stateOrigin", stateTL as "stateTL", series, universe
      FROM medium_toc;`,
    );
    const readStats = await readStatsPromise;
    const idMap = new Map<number, SecondaryMedium>();

    for (const value of readStats) {
      const secondary = value as unknown as SecondaryMedium;
      secondary.tocs = [];
      idMap.set(value.id, secondary);
    }

    for (const toc of tocs) {
      const secondary = getElseSet(idMap, toc.mediumId, () => ({
        id: toc.mediumId,
        readEpisodes: 0,
        totalEpisodes: 0,
        tocs: [],
      }));
      secondary.tocs.push(toc);
    }

    return [...idMap.values()];
  }

  public async getAllMedia(): Promise<number[]> {
    const result = await this.select<{ id: number }>("SELECT id FROM medium");
    return result.map((value) => value.id);
  }

  /**
   * Gets one or multiple media from the storage.
   */
  public getLikeMedium<T extends MultiSingleValue<LikeMediumQuery>>(likeMedia: T): PromiseMultiSingle<T, LikeMedium> {
    return promiseMultiSingle(likeMedia, async (value): Promise<LikeMedium> => {
      const escapedLinkQuery = escapeLike(value.link || "", { noRightBoundary: true });
      const escapedTitle = escapeLike(value.title, { singleQuotes: true });

      let result: any[] = await this.select(
        "SELECT id,medium FROM medium WHERE title LIKE ? OR id IN " +
          "(SELECT medium_id FROM medium_toc WHERE medium_id IS NOT NULL AND link LIKE ?);",
        [escapedTitle, escapedLinkQuery],
      );

      if (value.type != null) {
        result = result.filter((medium: any) => medium.medium === value.type);
      }
      return {
        medium: result[0],
        title: value.title,
        link: value.link || "",
      };
    });
  }

  /**
   * Updates a medium from the storage.
   */
  public async updateMediumToc(mediumToc: FullMediumToc): Promise<boolean> {
    const keys: Array<keyof FullMediumToc> = [
      "countryOfOrigin",
      "languageOfOrigin",
      "author",
      "title",
      "medium",
      "artist",
      "lang",
      "stateOrigin",
      "stateTL",
      "series",
      "universe",
    ];

    if (isInvalidId(mediumToc.mediumId) || !mediumToc.link) {
      throw new ValidationError("invalid medium_id or link is invalid: " + JSON.stringify(mediumToc));
    }
    const conditions = [];

    if (isInvalidId(mediumToc.id)) {
      conditions.push({ column: "medium_id", value: mediumToc.mediumId });
      conditions.push({ column: "link", value: mediumToc.link });
    } else {
      conditions.push({ column: "id", value: mediumToc.id });
    }
    const result = await this.update(
      "medium_toc",
      (updates, values) => {
        for (const key of keys) {
          const value = mediumToc[key];

          if (value === null) {
            updates.push(`${key} = NULL`);
          } else if (value != null) {
            updates.push(`${key} = ?`);
            values.push(value);
          }
        }
      },
      ...conditions,
    );
    storeModifications("toc", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Updates a medium from the storage.
   */
  public async updateMedium(medium: UpdateMedium): Promise<boolean> {
    const keys: Array<keyof UpdateMedium> = [
      "countryOfOrigin",
      "languageOfOrigin",
      "author",
      "title",
      "medium",
      "artist",
      "lang",
      "stateOrigin",
      "stateTL",
      "series",
      "universe",
    ];
    // prevent anybody from removing most important data from media
    if (medium.title != null && !medium.title) {
      delete medium.title;
    }
    if (medium.medium != null && !medium.medium) {
      delete medium.medium;
    }
    if (!Number.isInteger(medium.id) || medium.id <= 0) {
      throw new ValidationError("invalid medium, id, title or medium is invalid: " + JSON.stringify(medium));
    }
    const result = await this.update(
      "medium",
      (updates, values) => {
        for (const key of keys) {
          const value = medium[key];

          if (value === null) {
            updates.push(`${key} = NULL`);
          } else if (value != null) {
            updates.push(`${key} = ?`);
            values.push(value);
          }
        }
      },
      { column: "id", value: medium.id },
    );
    storeModifications("medium", "update", result);
    return result.rowCount > 0;
  }

  public async getSynonyms(mediumId: number | number[]): Promise<Synonyms[]> {
    const synonyms = await this.queryInList("SELECT * FROM medium_synonyms WHERE medium_id  IN (??);", [mediumId]);
    if (!synonyms) {
      return [];
    }
    const synonymMap = new Map<number, { mediumId: number; synonym: string[] }>();
    synonyms.forEach((value: any) => {
      const synonym = getElseSet(synonymMap, value.medium_id, () => ({ mediumId: value.medium_id, synonym: [] }));
      synonym.synonym.push(value.synonym);
    });
    return [...synonymMap.values()];
  }

  public removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
    return promiseMultiSingle(synonyms, (value: Synonyms) => {
      return promiseMultiSingle(value.synonym, async (item) => {
        const result = await this.delete(
          "medium_synonyms",
          {
            column: "synonym",
            value: item,
          },
          {
            column: "medium_id",
            value: value.mediumId,
          },
        );
        storeModifications("synonym", "delete", result);
        return result.rowCount > 0;
      });
    }).then(() => true);
  }

  public async addSynonyms<T extends MultiSingleValue<Synonyms>>(synonyms: T): Promise<boolean> {
    const params: Array<[number, string]> = [];
    multiSingle(synonyms, (value) => {
      multiSingle(value.synonym, (item: string) => {
        params.push([value.mediumId, item]);
      });
    });
    const result = await this.multiInsert(
      "INSERT INTO medium_synonyms (medium_id, synonym) VALUES",
      params,
      (value) => value,
      true,
    );
    multiSingle(result, (value) => storeModifications("synonym", "insert", value));
    return true;
  }

  public async addToc(mediumId: number, link: string): Promise<number> {
    const result = await this.query(
      "INSERT INTO medium_toc (medium_id, link) VAlUES (?,?) ON CONFLICT DO NOTHING RETURNING id",
      [mediumId, link],
    );
    storeModifications("toc", "insert", result);
    return result.rows[0].id;
  }

  public async getToc(mediumId: number): Promise<string[]> {
    const resultArray: any[] = await this.select("SELECT link FROM medium_toc WHERE medium_id=?", mediumId);
    return resultArray.map((value) => value.link).filter((value) => value);
  }

  public getMediumTocs(mediumId: number[]): Promise<FullMediumToc[]> {
    return this.queryInList(
      `SELECT id, medium_id as mediumId, link, 
      countryOfOrigin as "countryOfOrigin", languageOfOrigin as "languageOfOrigin",
      author, title, medium, artist, lang, stateOrigin as "stateOrigin",
      stateTL as "stateTL", series, universe
      FROM medium_toc WHERE medium_id IN (??);`,
      [mediumId],
    ) as Promise<FullMediumToc[]>;
  }

  public getTocs(tocIds: number[]): Promise<FullMediumToc[]> {
    return this.queryInList(
      `SELECT id, medium_id as mediumId, link, countryOfOrigin as "countryOfOrigin",
      languageOfOrigin as "languageOfOrigin", author, title, medium, artist, lang,
      stateOrigin as "stateOrigin", stateTL as "stateTL", series, universe
      FROM medium_toc WHERE id IN (??);`,
      [tocIds],
    ) as Promise<FullMediumToc[]>;
  }

  public async removeMediumToc(mediumId: number, link: string): Promise<boolean> {
    const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(link);

    if (!domainRegMatch) {
      throw new ValidationError("Invalid link, Unable to extract Domain: " + link);
    }

    await this.parentContext.jobContext.removeJobLike("name", `toc-${mediumId}-${link}`);
    const domain = domainRegMatch[1];

    const releases = await this.parentContext.episodeContext.getEpisodeLinksByMedium(mediumId);
    const episodeMap: Map<number, string[]> = new Map();
    const valueCb = () => [];

    for (const release of releases) {
      getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
    }
    const removeEpisodesAfter: number[] = [];

    for (const [episodeId, links] of episodeMap.entries()) {
      const toMoveCount = count(links, (value) => value.includes(domain));

      if (toMoveCount) {
        if (links.length === toMoveCount) {
          removeEpisodesAfter.push(episodeId);
        }
      }
    }
    const deletedReleaseResult = await this.query(
      "DELETE er FROM episode_release as er, episode as e, part as p" +
        " WHERE er.episode_id = e.id" +
        " AND e.part_id = p.id" +
        " AND p.medium_id = ?" +
        " AND locate(?,er.url) > 0;",
      [mediumId, domain],
    );
    storeModifications("release", "delete", deletedReleaseResult);

    const deletedProgressResult = await this.queryInList(
      "DELETE ue FROM user_episode as ue, episode as e, part as p" +
        " WHERE ue.episode_id = e.id" +
        " AND e.part_id = p.id" +
        " AND p.medium_id = ?" +
        " AND e.id IN (??);",
      [mediumId, removeEpisodesAfter],
    );
    multiSingle(deletedProgressResult, (value) => storeModifications("progress", "delete", value));

    const deletedResultResult = await this.queryInList(
      "DELETE re FROM result_episode as re, episode as e, part as p" +
        " WHERE re.episode_id = e.id" +
        " AND e.part_id = p.id" +
        " AND p.medium_id = ?" +
        " AND e.id IN (??);",
      [mediumId, removeEpisodesAfter],
    );
    multiSingle(deletedResultResult, (value) => storeModifications("result_episode", "delete", value));

    const deletedEpisodesResult = await this.queryInList("DELETE FROM episode WHERE episode.id IN (??);", [
      removeEpisodesAfter,
    ]);
    multiSingle(deletedEpisodesResult, (value) => storeModifications("episode", "delete", value));

    const result = await this.delete(
      "medium_toc",
      { column: "medium_id", value: mediumId },
      { column: "link", value: link },
    );
    storeModifications("toc", "delete", result);
    return result.rowCount > 0;
  }

  public getAllMediaTocs(): Promise<Array<{ link?: string; id: number }>> {
    return this.select(
      "SELECT medium.id, medium_toc.link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id",
    );
  }

  public getAllTocs(): Promise<MediumToc[]> {
    return this.select("SELECT medium_id as mediumId, link FROM medium_toc");
  }

  public async mergeMedia(sourceMediumId: number, destMediumId: number): Promise<boolean> {
    // transfer all tocs from source to dest and with it all associated episodes
    // add source title as synonym for dest
    // remove any jobs related to source
    // replace or ignore source id with dest id in:
    //  list_medium, external_list_medium, medium_synonyms, news_medium
    // the parts will be dropped for source id, the next job for dest should correct that again if possible
    // the tocs will be transferred and do not need to be moved manually here
    // transferring the tocs should remove any related jobs,
    // and toc jobs should be the only jobs related directly to an medium
    const sourceTocs = await this.getToc(sourceMediumId);
    const destTocs = await this.getToc(destMediumId);

    // transfer unknown tocs and all related episodes
    await Promise.all(
      sourceTocs
        .filter((toc) => !destTocs.includes(toc))
        .map((toc) => this.transferToc(sourceMediumId, destMediumId, toc)),
    );

    // remove all tocs of source
    let result = await this.delete("medium_toc", { column: "medium_id", value: sourceMediumId });
    storeModifications("toc", "delete", result);

    result = await this.query("UPDATE list_medium SET medium_id=? WHERE medium_id=?", [destMediumId, sourceMediumId]);
    storeModifications("list_item", "update", result);

    result = await this.delete("list_medium", { column: "medium_id", value: sourceMediumId });
    storeModifications("list_item", "delete", result);

    result = await this.query("UPDATE external_list_medium SET medium_id=? WHERE medium_id=?", [
      destMediumId,
      sourceMediumId,
    ]);
    storeModifications("external_list_item", "update", result);

    result = await this.delete("external_list_medium", { column: "medium_id", value: sourceMediumId });
    storeModifications("external_list_item", "delete", result);

    result = await this.query("UPDATE medium_synonyms SET medium_id=? WHERE medium_id=?", [
      destMediumId,
      sourceMediumId,
    ]);
    storeModifications("synonym", "update", result);

    result = await this.delete("medium_synonyms", { column: "medium_id", value: sourceMediumId });
    storeModifications("synonym", "delete", result);

    await this.query("UPDATE news_medium SET medium_id=? WHERE medium_id=?", [destMediumId, sourceMediumId]);

    await this.delete("news_medium", { column: "medium_id", value: sourceMediumId });
    const deletedReleaseResult = await this.query(
      "DELETE er FROM episode_release as er, episode as e, part as p" +
        " WHERE er.episode_id = e.id" +
        " AND e.part_id = p.id" +
        " AND p.medium_id = ?",
      sourceMediumId,
    );
    storeModifications("release", "delete", deletedReleaseResult);

    const deletedProgressResult = await this.query(
      "DELETE ue FROM user_episode as ue, episode as e, part as p" +
        " WHERE ue.episode_id = e.id" +
        " AND e.part_id = p.id" +
        " AND p.medium_id = ?",
      sourceMediumId,
    );
    storeModifications("progress", "delete", deletedProgressResult);

    const deletedResultResult = await this.query(
      "DELETE re FROM result_episode as re, episode as e, part as p" +
        " WHERE re.episode_id = e.id" +
        " AND e.part_id = p.id" +
        " AND p.medium_id = ?",
      sourceMediumId,
    );
    storeModifications("result_episode", "delete", deletedResultResult);

    const deletedEpisodesResult = await this.query(
      "DELETE e FROM episode as e, part as p" + " WHERE e.part_id = p.id" + " AND p.medium_id = ?",
      sourceMediumId,
    );
    storeModifications("episode", "delete", deletedEpisodesResult);

    const deletedPartResult = await this.query("DELETE FROM part" + " WHERE medium_id = ?", sourceMediumId);
    storeModifications("part", "delete", deletedPartResult);

    const deletedMediumResult = await this.query("DELETE FROM medium" + " WHERE id = ?", sourceMediumId);
    storeModifications("medium", "delete", deletedMediumResult);

    return true;
  }

  public async splitMedium(sourceMediumId: number, destMedium: SimpleMedium, toc: string): Promise<Id> {
    if (!destMedium?.medium || !destMedium.title) {
      return Promise.reject(
        new ValidationError(`Invalid destination Medium: ${destMedium?.title}-${destMedium?.medium}`),
      );
    }
    const result = await this.query(
      "INSERT INTO medium(medium, title) VALUES (?,?) ON CONFLICT DO NOTHING RETURNING id;",
      [destMedium.medium, destMedium.title],
    );
    const id = result.rows[0].id;
    if (!Number.isInteger(id)) {
      throw new ValidationError(`insert failed, invalid ID: ${id + ""}`);
    }
    storeModifications("medium", "insert", result);
    let mediumId: number;
    // medium exists already if insertId == 0
    if (id === 0) {
      const realMedium = await this.select<{
        id: number;
      }>("SELECT id FROM medium WHERE (medium, title) = (?,?);", [destMedium.medium, destMedium.title]);
      if (!realMedium.length) {
        throw new MissingEntityError("Expected a MediumId, but got nothing");
      }
      mediumId = realMedium[0].id;
    } else {
      await this.parentContext.partContext.createStandardPart(id);
      mediumId = id;
    }
    const success = await this.transferToc(sourceMediumId, mediumId, toc);
    return success ? mediumId : 0;
  }

  public async transferToc(sourceMediumId: number, destMediumId: number, toc: string): Promise<boolean> {
    const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(toc);

    if (!domainRegMatch) {
      throw new ValidationError("Invalid TocLink, Unable to extract Domain: " + toc);
    }

    const domain = domainRegMatch[1];

    await this.parentContext.jobContext.removeJobLike("name", `toc-${sourceMediumId}-${toc}`);
    const standardPartId = await this.parentContext.partContext.getStandardPartId(destMediumId);

    if (!standardPartId) {
      throw new DatabaseError("medium does not have a standard part");
    }

    const updatedTocResult = await this.query("UPDATE medium_toc SET medium_id = ? WHERE (medium_id, link) = (?,?);", [
      destMediumId,
      sourceMediumId,
      toc,
    ]);
    storeModifications("toc", "update", updatedTocResult);

    const releases = await this.parentContext.episodeContext.getEpisodeLinksByMedium(sourceMediumId);
    const episodeMap: Map<number, string[]> = new Map();
    const valueCb = () => [];

    for (const release of releases) {
      getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
    }
    const copyEpisodes: number[] = [];
    const removeEpisodesAfter: number[] = [];

    for (const [episodeId, links] of episodeMap.entries()) {
      const toMoveCount = count(links, (value) => value.includes(domain));

      if (toMoveCount) {
        copyEpisodes.push(episodeId);

        if (links.length === toMoveCount) {
          removeEpisodesAfter.push(episodeId);
        }
      }
    }
    // add the episodes of the releases
    const copyEpisodesResult = await this.queryInList(
      "INSERT INTO episode" +
        " (part_id, totalIndex, partialIndex, combiIndex, updated_at)" +
        " SELECT ?, episode.totalIndex, episode.partialIndex, episode.combiIndex, episode.updated_at" +
        " FROM episode INNER JOIN part ON part.id=episode.part_id" +
        " WHERE part.medium_id = ? AND episode.id IN (??) ON CONFLICT DO NOTHING;",
      [standardPartId, sourceMediumId, copyEpisodes],
    );
    multiSingle(copyEpisodesResult, (value) => storeModifications("episode", "insert", value));

    const updatedReleaseResult = await this.query(
      "UPDATE episode_release, episode as src_e, episode as dest_e, part" +
        " SET episode_release.episode_id = dest_e.id" +
        " WHERE episode_release.episode_id = src_e.id" +
        " AND src_e.part_id = part.id" +
        " AND part.medium_id = ?" +
        " AND dest_e.part_id = ?" +
        " AND src_e.combiIndex = dest_e.combiIndex" +
        " AND locate(?,episode_release.url) > 0;",
      [sourceMediumId, standardPartId, domain],
    );
    storeModifications("release", "update", updatedReleaseResult);

    const updatedProgressResult = await this.queryInList(
      "UPDATE user_episode, episode as src_e, episode as dest_e, part" +
        " SET user_episode.episode_id = dest_e.id" +
        " WHERE user_episode.episode_id = src_e.id" +
        " AND src_e.part_id = part.id" +
        " AND part.medium_id = ?" +
        " AND dest_e.part_id = ?" +
        " AND src_e.combiIndex = dest_e.combiIndex" +
        " AND src_e.id IN (??);",
      [sourceMediumId, standardPartId, removeEpisodesAfter],
    );
    multiSingle(updatedProgressResult, (value) => storeModifications("progress", "update", value));

    const updatedResultResult = await this.queryInList(
      "UPDATE result_episode, episode as src_e, episode as dest_e, part" +
        " SET result_episode.episode_id = dest_e.id" +
        " WHERE result_episode.episode_id = src_e.id" +
        " AND src_e.part_id = part.id" +
        " AND part.medium_id = ?" +
        " AND dest_e.part_id = ?" +
        " AND src_e.combiIndex = dest_e.combiIndex" +
        " AND src_e.id IN (??);",
      [sourceMediumId, standardPartId, removeEpisodesAfter],
    );
    multiSingle(updatedResultResult, (value) => storeModifications("result_episode", "update", value));

    const deletedReleasesResult = await this.queryInList("DELETE FROM episode_release" + " WHERE episode_id IN (??);", [
      removeEpisodesAfter,
    ]);
    multiSingle(deletedReleasesResult, (value) => storeModifications("release", "delete", value));

    const deletedUserEpisodesResult = await this.queryInList(
      "DELETE FROM user_episode" + " WHERE episode_id IN (??);",
      [removeEpisodesAfter],
    );
    multiSingle(deletedUserEpisodesResult, (value) => storeModifications("progress", "delete", value));

    const deletedResultEpisodesResult = await this.queryInList(
      "DELETE FROM result_episode" + " WHERE episode_id IN (??);",
      [removeEpisodesAfter],
    );
    multiSingle(deletedResultEpisodesResult, (value) => storeModifications("result_episode", "delete", value));

    const deletedEpisodesResult = await this.queryInList("DELETE FROM episode" + " WHERE id IN (??);", [
      removeEpisodesAfter,
    ]);
    multiSingle(deletedEpisodesResult, (value) => storeModifications("episode", "delete", value));

    const copiedOnlyEpisodes: number[] = copyEpisodes.filter((value) => !removeEpisodesAfter.includes(value));
    const copiedProgressResult = await this.queryInList(
      "INSERT INTO user_episode" +
        " (user_uuid, episode_id, progress, read_date)" +
        " SELECT user_episode.user_uuid, dest_e.id, user_episode.progress, user_episode.read_date" +
        " FROM user_episode, episode as src_e, episode as dest_e, part" +
        " WHERE user_episode.episode_id = src_e.id" +
        " AND src_e.part_id = part.id" +
        " AND part.medium_id = ?" +
        " AND dest_e.part_id = ?" +
        " AND src_e.combiIndex = dest_e.combiIndex" +
        " AND src_e.id IN (??) ON CONFLICT DO NOTHING;",
      [sourceMediumId, standardPartId, copiedOnlyEpisodes],
    );
    multiSingle(copiedProgressResult, (value) => storeModifications("progress", "insert", value));

    const copiedResultResult = await this.queryInList(
      "INSERT INTO result_episode" +
        " (novel, chapter, chapIndex, volIndex, volume, episode_id)" +
        " SELECT result_episode.novel, result_episode.chapter, result_episode.chapIndex," +
        " result_episode.volIndex, result_episode.volume, dest_e.id" +
        " FROM result_episode, episode as src_e, episode as dest_e, part" +
        " WHERE result_episode.episode_id = src_e.id" +
        " AND src_e.part_id = part.id" +
        " AND part.medium_id = ?" +
        " AND dest_e.part_id = ?" +
        " AND src_e.combiIndex = dest_e.combiIndex" +
        " AND src_e.id IN (??) ON CONFLICT DO NOTHING;",
      [sourceMediumId, standardPartId, copiedOnlyEpisodes],
    );
    multiSingle(copiedResultResult, (value) => storeModifications("result_episode", "insert", value));
    return true;
  }
}
