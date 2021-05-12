import { episodeStorage } from "../database/storages/storage";
import { stringToNumberList, isNumberOrArray, Errors, getDate, isString } from "../tools";
import { Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";

export const getEpisode = createHandler((req) => {
  let episodeId: string | number[] = extractQueryParam(req, "episodeId");
  const uuid = extractQueryParam(req, "uuid");

  // if it is a string, it is likely a list of episodeIds was send
  if (isString(episodeId)) {
    episodeId = stringToNumberList(episodeId);
  }
  if (!episodeId || !isNumberOrArray(episodeId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.getEpisode(episodeId, uuid);
});

export const postEpisode = createHandler((req) => {
  const { episode, partId } = req.body;
  if (!episode || (Array.isArray(episode) && !episode.length) || !partId || !Number.isInteger(partId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (Array.isArray(episode)) {
    episode.forEach((value) => (value.partId = partId));
  } else {
    episode.partId = partId;
  }
  return episodeStorage.addEpisode(episode);
});

export const putEpisode = createHandler(async (req) => {
  const { episode } = req.body;
  if (!episode || (Array.isArray(episode) && !episode.length)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (Array.isArray(episode)) {
    const values = await Promise.all(episode.map((value) => episodeStorage.updateEpisode(value)));
    return values.findIndex((value) => value) >= 0;
  } else {
    return episodeStorage.updateEpisode(episode);
  }
});

export const deleteEpisode = createHandler(async (req) => {
  const { episodeId } = req.body;
  if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (Array.isArray(episodeId)) {
    const values = await Promise.all(episodeId.map((value) => episodeStorage.updateEpisode(value)));
    return values.findIndex((value) => value) >= 0;
  } else {
    return episodeStorage.deleteEpisode(episodeId);
  }
});

export const getAllEpisodes = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return episodeStorage.getAll(uuid);
});

export const getAllReleases = createHandler(() => {
  return episodeStorage.getAllReleases();
});

export const getDisplayReleases = createHandler((req) => {
  const latest = extractQueryParam(req, "latest");
  const until = extractQueryParam(req, "until", true);
  const read = extractQueryParam(req, "read", true) ? extractQueryParam(req, "read").toLowerCase() == "true" : null;
  const uuid = extractQueryParam(req, "uuid");
  const ignoredLists = stringToNumberList(extractQueryParam(req, "ignore_lists", true) || "");
  const requiredLists = stringToNumberList(extractQueryParam(req, "only_lists", true) || "");
  const ignoredMedia = stringToNumberList(extractQueryParam(req, "ignore_media", true) || "");
  const requiredMedia = stringToNumberList(extractQueryParam(req, "only_media", true) || "");

  const latestDate = getDate(latest);
  const untilDate = until ? getDate(until) : null;

  if (!isString(latest) || !latestDate || (until && !untilDate)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return episodeStorage.getDisplayReleases(
    latestDate,
    untilDate,
    read,
    uuid,
    ignoredLists,
    requiredLists,
    ignoredMedia,
    requiredMedia,
  );
});

/**
 * Creates the Episode API Router.
 *
 * @openapi
 * tags:
 *  name: Episode
 *  description: API for Episodes
 */
export function episodeRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api/user/medium/part/episode/all:
   *    get:
   *      tags: [Episode]
   *      description: Get all Episodes
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/PureEpisode"
   *          description: Episodes array
   */
  router.get("/all", getAllEpisodes);

  /**
   * @openapi
   * /api/user/medium/part/episode:
   *    get:
   *      tags: [Episode]
   *      description: Get all Episode Releases
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/EpisodeRelease"
   *          description: Episode Release array
   */
  router.get("/releases/all", getAllReleases);

  /**
   * @openapi
   * /api/user/medium/part/episode:
   *    get:
   *      tags: [Episode]
   *      description: Query for Display Releases
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: latest
   *        in: query
   *        description: Date in ISO
   *        required: true
   *        schema:
   *          type: string
   *      - name: until
   *        in: query
   *        description: Date in ISO
   *        required: false
   *        schema:
   *          type: string
   *      - name: read
   *        in: query
   *        description: read status
   *        required: false
   *        schema:
   *          type: boolean
   *      - name: ignore_lists
   *        in: query
   *        description: List Ids to ignore releases from
   *        required: false
   *        schema:
   *          type: array
   *          items:
   *            $ref: "#/components/schemas/Id"
   *      - name: only_lists
   *        in: query
   *        description: List Ids to require releases from
   *        required: false
   *        schema:
   *          type: array
   *          items:
   *            $ref: "#/components/schemas/Id"
   *      - name: ignore_media
   *        in: query
   *        description: Medium Ids to ignore releases from
   *        required: false
   *        schema:
   *          type: array
   *          items:
   *            $ref: "#/components/schemas/Id"
   *      - name: only_media
   *        in: query
   *        description: Medium Ids to require releases from
   *        required: false
   *        schema:
   *          type: array
   *          items:
   *            $ref: "#/components/schemas/Id"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/DisplayRelease"
   *          description: DisplayRelease array
   */
  router.get("/releases/display", getDisplayReleases);

  const episodeRoute = router.route("");

  /**
   * @openapi
   * /api/user/medium/part/episode:
   *    get:
   *      tags: [Episode]
   *      description: get all Lists of the current User
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/Episode"
   *          description: List array
   */
  episodeRoute.get(getEpisode);

  /**
   * @openapi
   * /api/user/medium/part/episode:
   *    post:
   *      tags: [Episode]
   *      description: Create Episodes
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                partId:
   *                  $ref: "#/components/schemas/Id"
   *                episode:
   *                  type: array
   *                  items:
   *                    $ref: "#/components/schemas/Episode"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Episode"
   *          description: newly created Episode array
   */
  episodeRoute.post(postEpisode);

  /**
   * @openapi
   * /api/user/medium/part/episode:
   *    put:
   *      tags: [Episode]
   *      description: Add Medium to List
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                episode:
   *                  type: array
   *                  items:
   *                    $ref: "#/components/schemas/SimpleEpisode"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if successfully updated
   */
  episodeRoute.put(putEpisode);

  /**
   * @openapi
   * /api/user/medium/part/episode:
   *    delete:
   *      tags: [Episode]
   *      description: Delete Episodes
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                episodeId:
   *                  type: array
   *                  items:
   *                    $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if deleting the episodes succeeded
   */
  episodeRoute.delete(deleteEpisode);
  return router;
}
