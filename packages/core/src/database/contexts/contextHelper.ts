import {
  DBEntity,
  DisplayExternalUser,
  DisplayRelease,
  EpisodeRelease,
  FullMediumToc,
  MediumRelease,
  MinPart,
  PureDisplayRelease,
  PureEpisode,
  PureExternalUser,
  SimpleMedium,
  SimpleRelease,
} from "@/types";

export function fullMediaTocFromDB(value: DBEntity<FullMediumToc>): FullMediumToc {
  return {
    id: value.id,
    artist: value.artist,
    author: value.author,
    lang: value.lang,
    link: value.link,
    medium: value.medium,
    series: value.series,
    title: value.title,
    universe: value.universe,
    mediumId: value.mediumid,
    countryOfOrigin: value.countryoforigin,
    languageOfOrigin: value.languageoforigin,
    stateOrigin: value.stateorigin,
    stateTL: value.statetl,
  };
}

export function simpleMediumFromDB(value: DBEntity<SimpleMedium>): SimpleMedium {
  return {
    id: value.id,
    artist: value.artist,
    author: value.author,
    lang: value.lang,
    medium: value.medium,
    series: value.series,
    title: value.title,
    universe: value.universe,
    countryOfOrigin: value.countryoforigin,
    languageOfOrigin: value.languageoforigin,
    stateOrigin: value.stateorigin,
    stateTL: value.statetl,
  };
}

export function pureDisplayReleaseFromDB(value: DBEntity<PureDisplayRelease>): PureDisplayRelease {
  return {
    episodeId: value.episodeid,
    releaseDate: value.releasedate,
    title: value.title,
    locked: value.locked,
    url: value.url,
  };
}

export function pureEpisodeFromDB(value: DBEntity<PureEpisode>): PureEpisode {
  return {
    partId: value.partid,
    combiIndex: value.combiindex,
    totalIndex: value.totalindex,
    partialIndex: value.partialindex,
    readDate: value.readdate,
    id: value.id,
    progress: value.progress,
  };
}

export function minPartFromDB(value: DBEntity<MinPart>): MinPart {
  return {
    mediumId: value.mediumid,
    totalIndex: value.totalindex,
    partialIndex: value.partialindex,
    id: value.id,
    title: value.title,
  };
}

export function pureExternalUserFromDB(value: DBEntity<PureExternalUser>): PureExternalUser {
  return {
    identifier: value.identifier,
    localUuid: value.localuuid,
    type: value.type,
    uuid: value.uuid,
  };
}

export function episodeReleaseFromDB(value: any): EpisodeRelease {
  return {
    episodeId: value.episode_id,
    sourceType: value.source_type,
    tocId: value.toc_id,
    releaseDate: value.releasedate,
    locked: value.locked,
    title: value.title,
    url: value.url,
  };
}

export function displayReleaseFromDB(value: DBEntity<DisplayRelease>): DisplayRelease {
  return {
    episodeId: value.episodeid,
    date: value.date,
    locked: value.locked,
    title: value.title,
    link: value.link,
    mediumId: value.mediumid,
    progress: value.progress,
  };
}

export function mediumReleaseFromDB(value: DBEntity<MediumRelease>): MediumRelease {
  return {
    episodeId: value.episodeid,
    date: value.date,
    locked: value.locked,
    title: value.title,
    link: value.link,
    combiIndex: value.combiindex,
  };
}

export function simpleReleaseFromDB(value: DBEntity<SimpleRelease>): SimpleRelease {
  return {
    episodeId: value.episodeid,
    url: value.url,
  };
}

export function displayExternalUserFromDB(value: DBEntity<DisplayExternalUser>): DisplayExternalUser {
  return {
    identifier: value.identifier,
    lists: value.lists,
    localUuid: value.localuuid,
    type: value.type,
    uuid: value.uuid,
  };
}
