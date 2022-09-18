import { SimpleUser, User, Uuid, Nullable, UpdateUser } from "../../types";
import { allTypes, BcryptHash, Errors, Hasher, Hashes } from "../../tools";
import { v1 as uuidGenerator, v4 as sessionGenerator } from "uuid";
import { CredentialError, DuplicateEntityError, SessionError, ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { simpleUser } from "../databaseTypes";

/**
 * Checks whether the password equals to the given hash
 * of the specified algorithm.
 *
 * Return true if it does, else false.
 *
 * @param {string} password
 * @param {string} hash
 * @param {string} alg
 * @param {string} salt
 * @return {boolean}
 * @private
 */
const verifyPassword = (password: string, hash: string, alg: string, salt?: string): Promise<boolean> => {
  const hashAlgorithm = Hashes.find((value) => value.tag === alg);

  if (!hashAlgorithm) {
    throw new ValidationError("no such algorithm " + alg);
  }

  return hashAlgorithm.equals(password, hash, salt);
};

const StandardHash: Hasher = BcryptHash;
const standardListName = "Standard";

export class UserContext extends QueryContext {
  /**
   * Registers an User if the userName is free.
   * Returns a Error Code if userName is already
   * in use.
   *
   * If it succeeded, it tries to log the user in
   * immediately.
   *
   * Returns the uuid of the user
   * and the session key for the ip.
   */
  public async register(userName: string, password: string, ip: string): Promise<User> {
    if (!userName || !password) {
      return Promise.reject(new ValidationError("missing username or password"));
    }
    const userExists = await this.con.exists(sql`SELECT name FROM user WHERE name = ${userName};`);
    // userName is not new, so abort
    if (userExists) {
      return Promise.reject(new DuplicateEntityError(Errors.USER_EXISTS_ALREADY));
    }
    // if userName is new, proceed to register
    const id = uuidGenerator();
    const { salt, hash } = await StandardHash.hash(password);

    // insert the full user and loginUser right after
    await this.con.query(
      sql`INSERT INTO user (name, uuid, salt, alg, password)
      VALUES (${userName},${id},${salt ?? null},${StandardHash.tag},${hash});`,
    );

    // every user gets a standard list for everything that got no list assigned
    // this standard list name 'Standard' is reserved for this purpose
    await this.internalListContext.addList({ name: standardListName, medium: allTypes(), userUuid: id });

    return this.loginUser(userName, password, ip);
  }

  /**
   * Logs a user in.
   *
   * Returns the uuid of the user
   * and the session key for the ip.
   */
  public async loginUser(userName: string, password: string, ip: string): Promise<User> {
    if (!userName || !password) {
      return Promise.reject(new ValidationError("missing username or password"));
    }
    const user = await this.con.one(
      sql.type(simpleUser)`SELECT uuid, name, alg, password, salt FROM user WHERE name = ${userName};`,
    );

    const uuid = user.uuid;

    if (!(await verifyPassword(password, user.password, user.alg, user.salt ?? undefined))) {
      return Promise.reject(new CredentialError(Errors.INVALID_CREDENTIALS));
    }
    // if there exists a session already for that device, remove it
    await this.delete("user_log", { column: "ip", value: ip });

    // generate session key
    const session = sessionGenerator();
    const date = new Date().toISOString();

    await this.con.query(
      sql`INSERT INTO user_log (user_uuid, ip, session_key, acquisition_date) VALUES (${uuid},${ip},${session},${date});`,
    );

    return this._getUser(uuid, session);
  }

  /**
   * Checks if for the given ip any user is logged in.
   *
   * Returns the uuid of the logged in user and
   * the session key of the user for the ip.
   */
  public async userLoginStatus(ip: string, uuid?: Uuid, session?: string): Promise<boolean> {
    const sessionRecord = await this.con.maybeOne<{ sessionKey: string; userUuid: string }>(
      sql`SELECT user_uuid, session_key FROM user_log WHERE ip = ${ip};`,
    );

    if (!sessionRecord) {
      return false;
    }

    const currentSession = sessionRecord.sessionKey;

    if (session) {
      return session === currentSession && uuid === sessionRecord.userUuid;
    }
    return !!currentSession;
  }

  public async loggedInUser(ip: string): Promise<Nullable<SimpleUser>> {
    if (!ip) {
      return null;
    }
    const result = await this.con.query<{ name: string; uuid: string; sessionKey: string }>(
      sql`SELECT name, uuid, session_key FROM user_log 
      INNER JOIN user ON user.uuid=user_log.user_uuid
      WHERE ip = ${ip};`,
    );

    const userRecord = result.rows[0];

    if (!userRecord || !ip || !userRecord.sessionKey || !userRecord.name || !userRecord.uuid) {
      return null;
    }

    return {
      name: userRecord.name,
      session: userRecord.sessionKey,
      uuid: userRecord.uuid,
    };
  }

  public async getUser(uuid: Uuid, ip: string): Promise<User> {
    const hasSession = await this.con.maybeOne<{ sessionKey: string }>(
      sql`SELECT session_key FROM user_log WHERE user_uuid = ${uuid} AND ip = ${ip};`,
    );

    if (!hasSession) {
      throw new SessionError("user has no session");
    }

    return this._getUser(uuid, hasSession.sessionKey);
  }

  /**
   * Logs a user out.
   */
  public logoutUser(uuid: Uuid, ip: string): Promise<boolean> {
    return this.delete("user_log", { column: "ip", value: ip }).then((v) => v.rowCount > 0);
  }

  /**
   * Deletes the whole account of an user
   * with all associated data.
   *
   * Is irreversible.
   */
  public async deleteUser(uuid: Uuid): Promise<boolean> {
    // TODO delete all associated data
    // remove in sequence:
    // user_log => list_medium => reading_list
    // => external_list_medium => external_reading_list
    // => external_user => user_episode
    // delete sessions
    await this.delete("user_log", { column: "user_uuid", value: uuid });

    // delete reading lists contents
    await this.con.query(
      sql`DELETE FROM list_medium WHERE list_id in (SELECT id FROM reading_list WHERE user_uuid = ${uuid});`,
    );
    // delete lists
    await this.delete("reading_list", { column: "user_uuid", value: uuid });
    // delete external reading lists contents
    await this.con.query(
      sql`DELETE FROM external_list_medium
        WHERE list_id IN (
          SELECT id FROM external_reading_list
          WHERE user_uuid IN (
            SELECT uuid FROM external_user WHERE local_uuid = ${uuid}
          )
        );`,
    );

    // delete external lists
    await this.con.query(
      sql`DELETE FROM external_reading_list
      WHERE user_uuid
      IN (SELECT uuid FROM external_user WHERE local_uuid = ${uuid});`,
    );
    // delete external user
    await this.delete("external_user", { column: "local_uuid", value: uuid });

    // delete progress track?
    await this.delete("user_episode", { column: "user_uuid", value: uuid });

    // delete user itself
    // TODO check if delete was successful, what if not?
    //  in case the deletion was unsuccessful, just 'ban' any further access to that account
    //  and delete it manually?
    const result = await this.delete("user", { column: "uuid", value: uuid });
    return result.rowCount > 0;
  }

  /**
   * Updates the direct data of an user,
   * like name or password.
   *
   * Returns a boolean whether data was updated or not.
   */
  public async updateUser(uuid: Uuid, user: UpdateUser): Promise<boolean> {
    if (user.newPassword && user.password) {
      if (!(await this.verifyPassword(uuid, user.password))) {
        throw new CredentialError(Errors.INVALID_CREDENTIALS);
      }
    }
    return this.update(
      "user",
      async () => {
        const updates = [];
        if (user.name) {
          updates.push(sql`name = ${user.name}`);
        }

        if (user.newPassword) {
          // this should never happen, as verifyPassword should then fail?
          if (!user.password) {
            return Promise.reject(new ValidationError("missing password"));
          }
          const { salt, hash } = await StandardHash.hash(user.newPassword);

          updates.push(sql`alg = ${StandardHash.tag}`);
          updates.push(sql`salt = ${salt ?? null}`);
          updates.push(sql`password = ${hash}`);
        }
        return updates;
      },
      {
        column: "uuid",
        value: uuid,
      },
    ).then((value) => value.rowCount > 0);
  }

  /**
   * Verifies the password the user of
   * the given uuid.
   *
   * @param {string} uuid
   * @param {string} password
   * @return {Promise<boolean>}
   */
  public async verifyPassword(uuid: Uuid, password: string): Promise<boolean> {
    const user = await this.con.one<{ password: string; alg: string; salt: string }>(
      sql`SELECT password, alg, salt FROM user WHERE uuid = ${uuid}`,
    );
    return verifyPassword(password, user.password, user.alg, user.salt);
  }

  /**
   * Returns a user with their associated lists and external user from the storage.
   */
  private async _getUser(uuid: Uuid, session: string): Promise<User> {
    if (!uuid) {
      throw new ValidationError("missing uuid");
    }
    const user: User = {
      externalUser: [],
      lists: [],
      name: "",
      uuid: "",
      readToday: [],
      unreadChapter: [],
      unreadNews: [],
      session,
    };
    // query for user
    const userPromise = this.con
      .query<{ name: string }>(sql`SELECT name FROM user WHERE uuid = ${uuid};`)
      .then((value) => {
        // add user metadata
        user.name = value.rows[0].name;
        user.uuid = uuid;
      });
    await userPromise;
    return user;
  }
}
