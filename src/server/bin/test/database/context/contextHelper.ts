import * as storageTools from "../../../database/storages/storageTools";
import * as storage from "../../../database/storages/storage";
import { QueryContext } from "../../../database/contexts/queryContext";
import { MediaType, delay } from "../../../tools";

function inContext<T>(callback: storageTools.ContextCallback<T, QueryContext>, transaction = true) {
    return storage.storageInContext(callback, (con) => storageTools.queryContextProvider(con), transaction);
}

export async function setupTestDatabase(): Promise<void> {
    storage.poolConfig.update({host: "localhost"});
    await storage.poolConfig.recreate(true);
    storage.startStorage();
    await delay(5000);

    await inContext(context => context.query("CREATE DATABASE IF NOT EXISTS enterprise_test;"));

    storage.poolConfig.update({database: "enterprise_test", host: "localhost"});
    await storage.poolConfig.recreate(true);
    storage.startStorage();
    await delay(5000);
}

export async function tearDownTestDatabase(): Promise<void> {
    return inContext(context => context.query("DROP DATABASE enterprise_test;"));
}

export async function fillMediumTable(): Promise<void> {
    return inContext(context => context.query("INSERT INTO medium (id, medium) VALUES (?,?);", [1, MediaType.TEXT]));
}

export async function fillPartTable(): Promise<void> {
    return inContext(context => context.query("INSERT INTO part (id, medium_id, totalIndex) VALUES (?,?,?);", [1, 1, 1]));
}

export async function fillEpisodeTable(): Promise<void> {
    return inContext(context => context.query("INSERT INTO episode (id, part_id, totalIndex) VALUES (?,?,?);", [1, 1, 1]));
}

export async function cleanEpisode(): Promise<void> {
    return inContext(context => context.query("TRUNCATE episode;"));
}

export async function cleanPart(): Promise<void> {
    return inContext(context => context.query("TRUNCATE part;"));
}

export async function cleanMedium(): Promise<void> {
    return inContext(context => context.query("TRUNCATE medium;"));
}

export async function cleanAll(): Promise<void> {
    await cleanEpisode();
    await cleanPart();
    await cleanMedium();
}