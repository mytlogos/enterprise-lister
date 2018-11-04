/**
 *
 * @property {string} uuid
 * @property {string} name
 * @property {ObservableArray<ExternalUser>} external_user
 * @property {ObservableArray<List>} lists
 * @property {ObservableArray<Medium>} media
 */
class User {

    /**
     *
     */
    constructor() {
        this.lists = new ObservableArray();
        this.external_user = new ObservableArray();
        this.media = new ObservableArray();
    }

    /**
     *
     * @param {string} name
     * @return {this}
     */
    setName(name) {
        validateString(name);
        this.name = name;
        return this;
    }

    /**
     *
     * @param {string} uuid
     * @return {this}
     */
    setId(uuid) {
        validateString(uuid);
        this.uuid = uuid;
        return this;
    }

    /**
     *
     * @param {string} session
     * @return {this}
     */
    setSession(session) {
        validateString(session);
        this.session = session;
        return this;
    }

    /**
     *
     * @param {number} listId
     * @param {Medium...} media
     * @return {this}
     */
    pushMedium(listId, ...media) {
        let list = this.lists.find(value => value.id === listId);
        if (!list) {
            throw Error(`no list available with id=${listId}`);
        }
        media = media.map(value => Model.createMedium(value));
        list.items.push(...media);
        return this;
    }

    /**
     *
     * @param {Medium} medium
     * @return {this}
     */
    updateMedium(medium) {
        let oldMedium = this.media.find(value => value.id === medium.id);

        if (!oldMedium) {
            throw Error(Errors.DOES_NOT_EXIST);
        }
        Object.assign(oldMedium, medium);
        return this;
    }

    /**
     *
     * @param {ExternalUser...} user
     * @return {this}
     */
    pushExternalUser(...user) {
        user = user.map(value => Model.createExternalUser(value));
        this.external_user.push(...user);
        return this;
    }

    /**
     *
     * @param {number} listId
     * @param {number} mediumId
     * @return {this}
     */
    removeMedium(listId, mediumId) {
        //find list
        let list = this.lists.find(value => value.id === listId);

        //get index for medium
        let mediumIndex = list.items.findIndex(value => value.id === mediumId);

        if (mediumIndex >= 0) {
            //remove medium from items
            list.items.splice(mediumIndex, 1);
        }
        return this;
    }

    /**
     *
     * @param {number} listId
     * @return {this}
     */
    removeList(listId) {
        let listIndex = this.lists.findIndex(value => value.id === listId);

        if (listIndex >= 0) {
            this.lists.splice(listIndex, 1);
        }
        return this;
    }

    /**
     *
     * @param {Array<number>} mediumIds
     * @return {Array<Medium>}
     */
    getMediumData(...mediumIds) {
        return this.media.filter(value => mediumIds.includes(value.id));
    }

    /**
     *
     * @param {List...} lists
     * @return {this}
     */
    addList(...lists) {
        lists = lists.map(value => Model.createList(value));
        this.lists.push(...lists);
        return this;
    }

    /**
     *
     * @param {number} oldListId
     * @param {number} newListId
     * @param {number} mediumId
     * @return {this}
     */
    moveMedium(oldListId, newListId, mediumId) {
        return this
            .removeMedium(oldListId, mediumId)
            .pushMedium(newListId, mediumId);
    }

    /**
     *
     * @return {this}
     */
    clear() {
        this.name = "";
        this.session = "";
        this.uuid = "";
        this.media.length = 0;
        this.external_user.length = 0;
        this.lists.length = 0;
        return this;
    }
}

/**
 *
 * @property {string} uuid
 * @property {string} name
 * @property {number} service
 * @property {string|undefined| null} cookies
 * @property {ObservableArray<ExternalList>} lists
 */
class ExternalUser {
    constructor() {
        this.lists = new ObservableArray();
    }
}

/**
 *
 * @property {number} id identifier for medium
 * @property {string|undefined} countryOfOrigin
 * @property {string|undefined} languageOfOrigin
 * @property {string|undefined} author
 * @property {string} title
 * @property {number} medium
 * @property {string|undefined} artist
 * @property {string|undefined} lang
 * @property {number|undefined} stateOrigin
 * @property {number|undefined} stateTl
 * @property {string|undefined} series
 * @property {string|undefined} universe
 * @property {ObservableArray<Part>} parts
 */
class Medium {
    constructor() {
        this.parts = new ObservableArray();
    }
}

/**
 *
 * @property {number} id
 * @property {boolean} active
 * @property {string} name
 * @property {number} medium
 * @property {ObservableArray<number>} items
 */
class List {
    constructor() {
        this.items = new ObservableArray();
    }
}

/**
 *
 * @property {number} id
 * @property {boolean} active
 * @property {string} name
 * @property {number} medium
 * @property {string} url
 * @property {ObservableArray<number>} items
 */
class ExternalList extends List {

}

/**
 *
 * @property {number} id
 * @property {string| undefined} title
 * @property {number} totalIndex
 * @property {number| undefined} partialIndex
 * @property {ObservableArray<Episode>} episodes
 */
class Part {
    constructor() {
        this.episodes = new ObservableArray();
    }
}

/**
 *
 * @property {number} id
 * @property {string|undefined} title
 * @property {number} totalIndex
 * @property {number|undefined} partialIndex
 * @property {string} url
 * @property {string} releaseDate
 */

class Episode {

}

function assign(user, observable) {
    for (let key of Object.keys(user)) {
        let value = user[key];

        if (Array.isArray(value)) {
            observable[key].push(...value);
        } else {
            observable[key] = value;
        }
    }
}

const Model = {

    /**
     *
     * @return {User}
     */
    createUser(user) {
        if (user instanceof User) {
            return user;
        }

        let observable = Observable(new User());

        if (user) {
            assign(user, observable);
        }
        return observable;
    },

    /**
     *
     * @return {ExternalUser}
     */
    createExternalUser(user) {
        if (user instanceof ExternalUser) {
            return user;
        }
        let observable = Observable(new ExternalUser());

        if (user) {
            assign(user, observable);
        }
        return observable;
    },

    /**
     *
     * @return {Medium}
     */
    createMedium(medium) {
        if (medium instanceof Medium) {
            return medium;
        }

        let observable = Observable(new Medium());

        if (medium) {
            assign(medium, observable);
        }
        return observable;
    },

    /**
     *
     * @return {List}
     */
    createList(list) {
        if (list instanceof List) {
            return list;
        }

        let observable = Observable(new List());

        if (list) {
            assign(list, observable);
        }
        return observable;
    },

    /**
     *
     * @return {List}
     */
    createExternalList(list) {
        if (list instanceof ExternalList) {
            return list;
        }

        let observable = Observable(new ExternalList());

        if (list) {
            assign(list, observable);
        }
        return observable;
    },

    /**
     *
     * @return {Part}
     */
    createPart(part) {
        if (part instanceof Part) {
            return part;
        }

        let observable = Observable(new Part());

        if (part) {
            assign(part, observable);
        }
        return observable;
    },

    /**
     *
     * @return {Episode}
     */
    createEpisode(episode) {
        if (episode instanceof Episode) {
            return episode;
        }

        let observable = Observable(new Episode());

        if (episode) {
            assign(episode, observable);
        }
        return observable;
    }
};