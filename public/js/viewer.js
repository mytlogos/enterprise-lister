//todo login mechanism, check if it was already logged in before
//todo give a reason for any rejects

/**
 * A 'Resize'-events throttler which calls every added
 * callback in the next animation frame or after 66ms
 * after resize event fired.
 *
 * Callbacks are run only when no previous throttling is active.
 *
 * @type {{add}}
 */
const optimizedResize = (function () {

    let callbacks = [],
        running = false;

    // fired on resize event
    function resize() {
        //run callbacks on next AnimationFrame
        //or after 66ms only if it is not running
        if (!running) {
            running = true;

            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(runCallbacks);
            } else {
                setTimeout(runCallbacks, 66);
            }
        }

    }

    // run the actual callbacks
    function runCallbacks() {

        callbacks.forEach(function (callback) {
            callback();
        });

        running = false;
    }


    return {
        // public method to add additional callback
        add(callback) {

            //let throttler function listen to resize events
            if (!callbacks.length) {
                window.addEventListener('resize', resize);
            }

            //add callback
            callback && callbacks.push(callback);
        }
    }
}());

/**
 * Allowed Methods for the API.
 *
 * @type {{post: string, get: string, put: string, delete: string}}
 */
const Methods = {
    post: "POST",
    get: "GET",
    put: "PUT",
    delete: "DELETE"
};

/**
 * Media Types for Medium and Lists.
 * Properties are Flags.
 *
 * @type {{TEXT: number, AUDIO: number, VIDEO: number, IMAGE: number}}
 */
const MediaType = {
    TEXT: 0x1,
    AUDIO: 0x2,
    VIDEO: 0x4,
    IMAGE: 0x8,
};

/**
 *
 */
class User {

    constructor() {
        this.lists = [];
        this.external_user = [];
        this.media = [];
    }

    setName(name) {
        validateString(name);
        this.name = name;
        document.querySelectorAll(".user").forEach(value => value.textContent = this.name);
        return this;
    }

    setId(uuid) {
        validateString(uuid);
        this.uuid = uuid;
        return this;
    }

    setSession(session) {
        validateString(session);
        this.session = session;
        return this;
    }

    pushMedium(listId, ...media) {
        let list = this.lists.find(value => value.id === listId);

        if (!list) {
            throw Error(`no list available with id=${listId}`);
        }

        list.items.push(...media);
        TableManager.addData(media);
        return this;
    }

    updateMedium(medium) {
        let oldMedium = this.media.find(value => value.id === medium.id);

        if (!oldMedium) {
            throw Error(Errors.DOES_NOT_EXIST);
        }
        Object.assign(oldMedium, medium);
        TableManager.updateRow(oldMedium);
        return this;
    }

    pushExternalUser(...user) {

        return this;
    }

    removeMedium(listId, mediumId) {
        return this;
    }

    removeList(listId) {

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

    addList(...lists) {
        this.lists.push(...lists);
        ListManager.addLists(...lists);
        return this;
    }

    moveMedium() {

        return this;
    }

    addExternalUser(...user) {
        this.external_user.push(...user);
    }

    clear() {
        this.name = "";
        document.querySelectorAll(".user").forEach(value => value.textContent = "");

        return this;
    }
}

function isValidString(...values) {
    return values.every(value => value && (typeof value === 'string' || value instanceof String));
}

function validateString(value) {
    if (!(value && (typeof value === 'string' || value instanceof String))) {
        throw Error(`'${value}' is no valid string input`);
    }
}

/**
 * Object which handles all operations on the Media Table.
 *
 * @type {
 * {
 * table: HTMLElement,
 * header_container: HTMLElement,
 * rowsContainer: HTMLElement,
 * data: Array,
 * dataRows: number,
 * filter: (function(): boolean),
 * applyFilter(*): void,
 * fillEmpty(): (undefined|void),
 * addData(*, *=): void,
 * clear(): void
 * }
 * }
 */
const TableManager = {
    /**
     *
     * @return {HTMLElement}
     */
    get table() {
        return document.getElementById("list-data");
    },
    /**
     *
     * @return {HTMLElement}
     */
    get headerContainer() {
        return document.querySelector("#list-data > thead > tr");
    },

    /**
     *
     * @return {HTMLElement}
     */
    get rowsContainer() {
        return document.querySelector("#list-data > tbody");
    },

    /**
     *
     */
    data: [],
    dataRows: 0,
    rows: [],
    filter: () => true,

    header: [],

    init() {
        let mediumAttributes = {
            "title": "Title",
            "medium": "Medium",
            "author": "Author",
            "series": "Series",
            "universe": "Universe",
            "artist": "Artist",
            "countryOfOrigin": "COO",
            "languageOfOrigin": "Language in COO",
            "lang": "Language",
            "stateOrigin": "Status in COO",
            "stateTL": "Translator Status"
        };

        for (let key of Object.keys(mediumAttributes)) {
            let value = mediumAttributes[key];
        }
    },

    /**
     *
     * @param filter
     */
    applyFilter(filter) {
        if (typeof (filter) !== "function") {
            throw Error("filter must be a function!")
        }
        this.filter = filter;

        //reset rows
        this.data_rows = 0;

        this.data.forEach(value => {
            let rowItem = this.rows.find(rowItem => rowItem.id === value.value.id);
            //hide items which are filtered, and show which are not filtered out
            rowItem.element.style.display = filter(value) ? "table-row" : "none";
        });
    },

    /**
     * If there is empty space from the last row to the bottom of the table,
     * fill it with empty rows.
     *
     * Removes any surplus empty rows if they would cause the scrollbar to appear.
     */
    fillEmpty() {
        let table = this.table;
        let parent = table.parentElement;
        let parent_size = parseInt(window.getComputedStyle(parent).height);
        let siblingsHeight = 0;
        let tableHeight;

        //calculate the height of the siblings of the table
        for (let child = parent.firstElementChild; child !== null; child = child.nextElementSibling) {
            let height = parseInt(window.getComputedStyle(child).height);

            //if it is not table, add it to siblingsHeight,
            //else set it as tableHeight
            if (child !== table) {
                siblingsHeight += height;
            } else {
                tableHeight = height;
            }
        }
        //calculate the empty space for table
        let remaining = parent_size - tableHeight - siblingsHeight;

        //straight skip it if no rows should be added/removed
        if (remaining >= 0 && remaining < 40) {
            return
        }

        //a size of 40px is the size of a cell and with that, the size of a row
        remaining = remaining / 40;

        //check whether there are rows to insert (positive) or remove (negative)
        let abs_remaining = Math.trunc(Math.abs(remaining));
        let rowsContainer = this.rowsContainer;
        let rows = rowsContainer.children;

        if (remaining < 0) {
            //iterate from end to the number of potential remove-able rows
            let max_i = rows.length - 1;
            for (let i = max_i; i >= max_i - abs_remaining; i--) {
                //check if it is an empty row, else break it, because the empty rows are the last ones
                let row = rows[rows.length - 1];
                if (row.innerText.trim() === "") {
                    //delete the last row, also this one
                    rowsContainer.removeChild(row);
                } else {
                    break;
                }
            }
        } else if (remaining > 0) {
            //iterate for the number of new rows
            for (let i = 0; i < abs_remaining; i++) {
                let row = document.createElement("tr");

                //fill the row with cells in number to the table headers
                for (let j = 0; j < this.headerContainer.childElementCount; j++) {
                    row.insertCell(-1);
                }
                rowsContainer.appendChild(row);
            }
        }
    },

    /**
     *
     * @param {Array<Medium>} data
     * @param {boolean} push
     */
    addData(data, push = true) {
        if (push) {
            this.data.push(...data);
        }
        let header = this.headerContainer.children;
        let rowsContainer = this.rowsContainer;
        let rows = rowsContainer.children;

        data.forEach(dataItem => {
            //check if this data should be displayed
            if (!this.filter(dataItem)) {
                return
            }
            //if there are no empty rows, create new ones and fill them with data
            if (rows.length === this.data_rows) {
                let row = document.createElement("tr");

                for (let head of header) {
                    let cell_value = dataItem[head.getAttribute("data-name")];

                    if (!cell_value) {
                        cell_value = "-";
                    }

                    row.insertCell(-1).innerText = cell_value;
                }
                rowsContainer.appendChild(row);
                this.rows.push({element: row, value: dataItem});

                //if there are empty rows available, fill them with data
            } else if (rows.length > this.data_rows) {
                let row = rows[this.data_rows];

                for (let i = 0; i < header.length; i++) {
                    let head = header[i];
                    let cell = row.cells[i];

                    let cell_value = dataItem[head.getAttribute("data-name")];

                    if (!cell_value) {
                        cell_value = "-";
                    }

                    cell.innerText = cell_value;
                }

                this.rows.push({element: row, value: dataItem})
            }
            this.data_rows++;
        });
    },

    /**
     * Removes the specified rows from the table
     * Removes the data from the Manager if the remove flag is true.
     *
     * @param {Array<Medium>} data
     * @param {boolean} remove
     */
    removeData(data, remove = true) {
        this.rows
            .filter(value => data.includes(value.id))
            .forEach(value => value.element.remove());

        let filter = value => !data.includes(value.id);

        this.rows = this.rows.filter(filter);
        this.data = this.data.filter(filter);
    },

    /**
     *
     * @param {Medium} medium
     */
    updateRow(medium) {
        let row = this.rows.find(value => value.id === medium.id).element;
        let header = this.headerContainer.children;

        for (let i = 0; i < header.length; i++) {
            let head = header[i];
            let cell = row.cells[i];

            let cell_value = medium[head.getAttribute("data-name")];

            if (!cell_value) {
                cell_value = "-";
            }

            cell.innerText = cell_value;
        }
    },

    /**
     *
     */
    clear() {
        //clear current data
        this.data = [];
        this.data_rows = 0;
        //remove all data rows
        document.querySelectorAll("#list-data > tbody > tr").forEach(value => value.remove());
        //fill up the height with empty rows
        this.fillEmpty();
    }
};

function Binding(object, property, listener) {
    /**
     *
     * @return {*}
     */
    let valueGetter = () => object[property];

    /**
     *
     * @param val
     */
    let valueSetter = val => {
        listener(val);
        object[property] = val;
    };

    Object.defineProperty(object, property, {
        get: valueGetter,
        set: valueSetter
    });
}

class MediumItem {

    /**
     *
     * @param {HTMLTableRowElement} row
     * @param {Medium} medium
     */
    constructor(row, medium) {
        new Binding(this, medium, "title", value => {

        });
        new Binding(this, medium, "title", value => {

        });
        new Binding(this, medium, "title", value => {

        });
        new Binding(this, medium, "title", value => {

        });
        new Binding(this, medium, "title", value => {

        });
        new Binding(this, medium, "title", value => {

        });
    }
}

class ListItem {

}

/**
 * Object which handles all operations on the reading list.
 *
 * @type {{
 * data: Array<List>,
 * list: HTMLElement,
 * sorter: HTMLElement,
 * addList(...Array<List>): void,
 * clear(): void
 * }}
 */
const ListManager = {
    /**
     * @type {Array<List>}
     */
    data: [],
    rows: [],
    /**
     *
     * @return {HTMLElement}
     */
    get list() {
        return document.querySelector("#reading-lists");
    },
    /**
     *
     * @return {HTMLElement}
     */
    get sorter() {
        return document.querySelector("#sorter");
    },


    /**
     *
     * @param {Array<List>} lists
     */
    addLists(...lists) {
        this.data.push(...lists);
        let list_container = this.list;

        lists.forEach(list => {
            let item = document.createElement("li");

            item.innerText = list.name;
            item.addEventListener("click", evt => {
                //0 is left mouse click
                if (evt.button !== 0) {
                    return;
                }
                if (item.classList.toggle("active")) {
                    list.active = true;

                    TableManager.addData(SessionManager.user.getMediumData(list.items));
                } else {
                    list.active = false;

                    let activeMedia = this.data.flatMap(value => value.active ? value.items : []);
                    let inActiveMedia = list.items.filter(value => !activeMedia.includes(value));

                    TableManager.removeData(inActiveMedia);
                }
            });
            list_container.appendChild(item);
            this.rows.push({element: item, value: list});
        });
    },

    updateList(list) {
        //todo expand update list, if other things except name are displayed
        for (let row of this.rows) {
            if (row.value.id === list.id) {
                row.element.innerText = list.name;
                break;
            }
        }
    },

    /**
     *
     * @param {number|HTMLElement|Array<number>|Array<HTMLElement>} list
     */
    removeList(list) {
        if (Number.isInteger(list)) {
            this.data = this.data.filter(value => value.id !== list);
            this.rows = this.rows.filter(value => {
                if (value.value.id !== list) {
                    return true;
                } else {
                    value.element.remove();
                    return false;
                }
            });

        } else if (list instanceof HTMLElement) {
            list.remove();
            this.rows = this.rows.filter(value => {
                if (value.element !== list) {
                    return true;
                } else {
                    this.data = this.data.filter(dataItem => dataItem.id !== value.id);
                    return false;
                }
            });
        } else {
            list.forEach(value => this.removeList(value));
        }
    },

    /**
     *
     */
    clear() {
        this.data = [];
        this.list.querySelectorAll("*").forEach(value => value.remove())
    }
};

const SessionManager = {
    /**
     * @type User
     */
    user: new User(),

    get loggedIn() {
        return Boolean(this.user.uuid);
    },

    /**
     *
     * @param {string} uuid
     * @param {string} session
     * @param {string} name
     * @param {Array<ExternalUser>} external_user
     * @param {Array<List>} lists
     * @return {Promise<User>}
     */
    createUser({uuid, session, name, external_user = [], lists = []}) {
        try {
            return this.user
                .clear()
                .setName(name)
                .setId(uuid)
                .setSession(session)
                .addList(...lists)
                .addExternalUser(...external_user);
        } catch (e) {
            //in case some error happened while adding new data,
            //clear any rest data and rethrow error
            this.user.clear();
            throw e;
        }
    },

    /**
     * Checks whether a user is currently logged in on this device.
     *
     * @return {Promise<boolean>}
     */
    isLoggedIn() {
        return this
            .queryServer({auth: false})
            .then(result => {
                if (!result) {
                    return false;
                }
                this.createUser(result);
                return true;
            })
    },

    /**
     * @param {{element: HTMLInputElement, value: string}} userName
     * @param {{element: HTMLInputElement, value: string}} psw
     *
     * @return {Promise<boolean>}
     */
    login(userName, psw) {
        //need to be logged out to login
        if (SessionManager.loggedIn) {
            return Promise.reject();
        }

        if (!userName || !psw) {
            return Promise.reject();
        }

        return this
            .queryServer({
                query: {
                    userName: userName,
                    pw: psw
                },
                path: "login",
                method: Methods.post,
                auth: false
            })
            .then(result => {
                this.createUser(result);
                return true;
            });
    },

    /**
     * @param {string} userName
     * @param {string} psw
     * @param {string} psw_repeat
     *
     * @return {*}
     */
    register(userName, psw, psw_repeat) {
        //need to be logged out to login
        if (SessionManager.loggedIn) {
            return
        }
        if (psw !== psw_repeat) {
            //todo show incorrect password
            return Promise.reject();
        }

        return this
            .queryServer({
                query: {
                    userName: userName,
                    pw: psw
                },
                path: "register",
                method: Methods.post,
                auth: false
            })
            .then(result => {
                this.createUser(result);
                return true;
            });
    },


    /**
     * @return {Promise<boolean>}
     */
    logout() {
        return this
            .queryServer({
                path: "logout",
                method: Methods.post,
            })
            .then(result => result.loggedOut)
            .then(loggedOut => {
                this.user.clear();

                if (!loggedOut) {
                    //todo show error msg, but still clear data?
                }
                return loggedOut;
            })
            .catch(error => console.log(error));
    },

    /**
     *
     * @param {number} list_id
     * @param {Array<number>} unknown_media
     * @return {Promise<Array<Medium>>}
     */
    loadListItems(list_id, unknown_media) {
        if (!unknown_media.length) {
            return Promise.resolve([]);
        }
        return this.queryServer({
            query: {
                listId: list_id,
                media: unknown_media
            },
            path: "list/medium",
        });
    },

    /**
     *
     * @param {List} list
     * @return {Promise<List>}
     */
    createList(list) {
        return this
            .queryServer({
                query: {list: list},
                path: "list/",
                method: Methods.post,
            });
    },

    /**
     *
     * @param {List} list
     * @return {Promise<boolean>}
     */
    updateList(list) {
        return this
            .queryServer({
                query: {list: list},
                path: "list/",
                method: Methods.put,
            });
    },

    /**
     *
     * @param {number} list_id
     * @return {Promise<boolean>}
     */
    deleteList(list_id) {
        return this
            .queryServer({
                query: {listId: list_id},
                path: "list/",
                method: Methods.delete,
            })
            .then(result => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            });
    },

    /**
     * @return {Promise<Array<List>>}
     */
    loadUserLists() {
        return this
            .queryServer({
                path: "list/",
            });
    },

    /**
     *
     * @param {Medium} medium
     */
    createMedium(medium) {
        return this.queryServer({
            query: {medium},
            path: "medium/",
            method: Methods.post,
        });
    },

    getMedia() {

    },

    updateMedium() {

    },

    deleteMedium() {

    },

    /**
     * @return {Promise<*>}
     */
    queryExtension() {
        return new Promise(((resolve, reject) => {
            //todo implement extension query
            //one should not use this, because 'direct' communication
            //with the extension is only possible by sending message through
            //window or other elements, which can be listened to by everyone
        }));
    },

    /**
     *
     * @param {Object?} query
     * @param {string?} path
     * @param {string?} method
     * @param {boolean?} auth
     * @return {Promise<Object>}
     */
    queryServer({query, path = "", method = Methods.get, auth = true} = {}) {
        if (auth) {
            if (!this.user.uuid) {
                throw Error("cannot send user message if no user is logged in")
            }
            if (!query) {
                query = {};
            }
            query.uuid = this.user.uuid;
            query.session = this.user.session;
        }
        let init = {
            method: method,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        };
        //append json query if
        if (query) {
            init.body = JSON.stringify(query);
        }
        return fetch(`${window.location}api/user/${path}`, init)
            .then(response => response.json())
            .then(result => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            });
    },
};

function hideModal(modal) {
    modal.classList.add("hidden");
}

function showModal(modal) {
    modal.classList.remove("hidden");
}

const ModalReader = {

    /**
     *
     * @param {string} modal
     * @return {number}
     */
    getMediaTypes(modal) {
        let types = Object.keys(MediaType);
        let mediumType = 0;

        let mediumChecks = document.querySelectorAll(`${modal}.modal .medium-check-container input`);

        mediumChecks.forEach(value => {
            if (value.checked) {
                let checkedType = value.className.toUpperCase();
                let key = types.find(type => type === checkedType);
                mediumType |= MediaType[key];
            }
        });
        return mediumType;
    },

    resetMediaTypes(modal) {
        document
            .querySelectorAll(`${modal}.modal .medium-check-container input`)
            .forEach(value => value.checked = false);
    },

    resetInput(...inputs) {
        inputs.forEach(value => value.value = "");
    },

    finishMedium() {
        let modal = document.querySelector(".add-medium.modal");
        let mediumType = this.getMediaTypes(".add-medium");

        let titleInput = modal.querySelector(".add-medium.modal .input-title input");
        let authorInput = modal.querySelector(".add-medium.modal .input-author input");
        let artistInput = modal.querySelector(".add-medium.modal .input-artist input");
        let seriesInput = modal.querySelector(".add-medium.modal .input-series input");
        let universeInput = modal.querySelector(".add-medium.modal .input-universe input");
        let languageInput = modal.querySelector(".add-medium.modal .input-language languageinput");
        let countryOfOriginInput = modal.querySelector(".add-medium.modal .input-countryOfOrigin input");
        let langOfOriginInput = modal.querySelector(".add-medium.modal .input-langOfOrigin input");
        let stateTlInput = modal.querySelector(".add-medium.modal .input-stateTl input");
        let stateCOOInput = modal.querySelector(".add-medium.modal .input-stateCOO input");

        let name = titleInput.value;

        if (!name || !mediumType) {
            throw Error("no valid input")
        }

        let medium = {
            name: name,
            medium: mediumType,
        };

        //add optional values
        authorInput.value && (medium.author = authorInput.value);
        artistInput.value && (medium.artist = artistInput.value);
        seriesInput.value && (medium.series = seriesInput.value);
        universeInput.value && (medium.universe = universeInput.value);
        languageInput.value && (medium.language = languageInput.value);
        countryOfOriginInput.value && (medium.countryOfOrigin = countryOfOriginInput.value);
        langOfOriginInput.value && (medium.languageOfOrigin = langOfOriginInput.value);
        stateTlInput.value && (medium.stateTl = stateTlInput.value);
        stateCOOInput.value && (medium.stateOrigin = stateCOOInput.value);

        SessionManager
            .createMedium(medium)
            .then(result => {
                hideModal(modal);

                this.resetInput(
                    titleInput,
                    authorInput,
                    artistInput,
                    seriesInput,
                    universeInput,
                    languageInput,
                    countryOfOriginInput,
                    langOfOriginInput,
                    stateTlInput,
                    stateCOOInput
                );
                this.resetMediaTypes(".add-medium");
                SessionManager.user.pushMedium(result);
            })
            .catch(error => {
                //todo
                let errorText = modal.querySelector(".add-list.modal .error");
            });
    },


    finishList() {
        let modal = document.querySelector(".add-list.modal");

        let mediumType = this.getMediaTypes(".add-list");

        let nameInput = modal.querySelector(".add-list.modal .input-name input");
        let name = nameInput.value;

        if (!name || !mediumType) {
            throw Error("no valid input")
        }
        SessionManager
            .createList({
                name: name,
                medium: mediumType,
            })
            .then(result => {
                hideModal(modal);

                this.resetInput(nameInput);
                this.resetMediaTypes(".add-list");
                SessionManager.user.addList(result);
            })
            .catch(error => {
                //todo
                let errorText = modal.querySelector(".add-list.modal .error");
            });
    },

    finishLogin() {
        let modal = document.querySelector(".login.modal");

        let userName_input = modal.querySelector(".login.modal .input-userName input");
        let psw_input = modal.querySelector(".login.modal .input-psw input");

        SessionManager
            .login(userName_input.value, psw_input.value)
            .then(result => {
                hideModal(modal);

                this.resetInput(userName_input, psw_input);

                changePageOnLoginState();
                return result;
            })
            .catch(error => {
                hideModal(modal);
                this.resetInput(psw_input, userName_input);

                console.log("failed login ", error);
                //todo implement on fail
            });
    },


    finishRegister() {
        let modal = document.querySelector(".register.modal");

        let userName_input = modal.querySelector(".register.modal .input-userName input");
        let psw_input = modal.querySelector(".register.modal .input-psw input");
        let psw_repeat_input = modal.querySelector(".register.modal .input-psw-repeat input");

        SessionManager
            .register(userName_input.value, psw_input.value, psw_repeat_input.value)
            .then(result => {
                hideModal(modal);

                this.resetInput(userName_input, psw_input, psw_repeat_input);

                changePageOnLoginState();
                return result;
            })
            .catch(error => {
                hideModal(modal);

                this.resetInput(userName_input, psw_repeat_input, psw_input);

                console.log("failed register ", error)
                //todo implement on fail
            });
    }
};


(function setup() {
    /**
     * Enables the register, login popups, e.g. adds listener to show/hide them,
     * and adds login, register, logout functionality to page.
     */
    (function initPage() {
        document.querySelectorAll(".modal").forEach(value => {
            let closeBtn = value.querySelector(".close");
            //add click listener which closes popup if one clicks outside the popup box
            window.addEventListener("click", evt => {
                // noinspection JSCheckFunctionSignatures
                if (!value.contains(evt.target) && !value.classList.contains("hidden")) {
                    hideModal(value);
                    evt.stopImmediatePropagation();
                }
            }, {capture: true});

            //show modal after corresponding button is clicked
            document
                .querySelector(`.${value.classList.item(0)}.btn`)
                .addEventListener("click", () => showModal(value));

            //add click listener which closes popup if one clicks the close button
            closeBtn.addEventListener('click', () => hideModal(value));
        });

        //add functionality to button
        document.querySelector(".logout.btn").addEventListener(
            "click",
            () => SessionManager.logout().finally(() => changePageOnLoginState())
        );

        //various click listener which do action if modal popup served its purpose/is finished
        document.querySelector(".add-list.modal .finish").addEventListener("click", () => ModalReader.finishList());
        document.querySelector(".add-medium.modal .finish").addEventListener("click", () => ModalReader.finishMedium());
        document.querySelector(".login.modal .finish").addEventListener("click", () => ModalReader.finishLogin());
        document.querySelector(".register.modal .finish").addEventListener("click", () => ModalReader.finishRegister());

        document.querySelectorAll(".medium-check-container").forEach(value => {
            for (let key of Object.keys(MediaType)) {
                let text = key.substring(0, 1) + key.substring(1).toLowerCase();

                let label = document.createElement("label");
                let checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = key.toLowerCase();

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(text));
                value.appendChild(label);
            }
        });
    })();


    (function enableAutoComplete() {

    })();

    /**
     * Enable filter buttons, which enact filters on the table´s content.
     */
    (function enableFilterButtons() {
        let container = document.getElementById("cb-btn-container");
        let buttons = container.querySelectorAll(".btn");
        let all_btn = container.querySelector(".all");
        let header_container = document.querySelector("#list-data > thead > tr");

        buttons.forEach(value => {
            if (value !== all_btn) {
                let th = document.createElement("th");
                th.innerText = value.innerText;
                th.setAttribute("data-name", value.getAttribute("name"));
                th.classList.add("hidden");

                header_container.appendChild(th);

                value.addEventListener("click", () => {
                    //hide the column if it was already checked
                    if (value.classList.contains("checked")) {
                        value.classList.remove("checked");

                        th.classList.add("hidden");
                        //nth of type start from 1 not zero
                        document
                            .querySelectorAll(`#list-data > tbody  td:nth-of-type(${indexOf(th) + 1})`)
                            .forEach(td => td.classList.add("hidden"));
                    } else {
                        value.classList.add("checked");
                        th.classList.remove("hidden");

                        //nth of type start from 1 not zero
                        document
                            .querySelectorAll(`#list-data > tbody td:nth-of-type(${indexOf(th) + 1})`)
                            .forEach(td => td.classList.remove("hidden"));
                    }
                });
            } else {
                value.addEventListener("click", () => {
                    buttons.forEach(other_btn => {
                        if (other_btn !== all_btn && !other_btn.classList.contains("checked")) {
                            other_btn.click();
                        }
                    })
                });
            }
        });
        all_btn.click();
    })();

    /**
     * Enables custom drop menus.
     */
    (function enableCustomDropMenu() {
        let x, i, j, selectElement, a, b, c;
        /*look for any elements with the class "custom-select":*/
        x = document.getElementsByClassName("select-container");

        for (i = 0; i < x.length; i++) {
            selectElement = x[i].getElementsByTagName("select")[0];
            /*for each element, create a new div that will act as the selected item:*/
            a = document.createElement("div");
            a.setAttribute("class", "select-selected");
            a.innerHTML = selectElement.options[selectElement.selectedIndex].innerHTML;
            x[i].appendChild(a);
            /*for each element, create a new DIV that will contain the option list:*/
            b = document.createElement("div");
            b.setAttribute("class", "select-items hidden");

            for (j = 1; j < selectElement.length; j++) {
                /*for each option in the original select element,
                create a new DIV that will act as an option item:*/
                c = document.createElement("DIV");
                c.innerHTML = selectElement.options[j].innerHTML;
                c.addEventListener("click", function () {
                    /*when an item is clicked, update the original select box,
                    and the selected item:*/
                    let y, i, k, s, h;
                    s = this.parentNode.parentNode.getElementsByTagName("select")[0];
                    h = this.parentNode.previousSibling;
                    for (i = 0; i < s.length; i++) {
                        if (s.options[i].innerHTML === this.innerHTML) {
                            s.selectedIndex = i;
                            h.innerHTML = this.innerHTML;
                            y = this.parentNode.getElementsByClassName("same-as-selected");
                            for (k = 0; k < y.length; k++) {
                                y[k].removeAttribute("class");
                            }
                            this.setAttribute("class", "same-as-selected");
                            break;
                        }
                    }
                    h.click();
                });
                b.appendChild(c);
            }
            x[i].appendChild(b);
            a.addEventListener("click", function (e) {
                /*when the select box is clicked, close any other select boxes,
                and open/close the current select box:*/
                e.stopPropagation();
                closeAllSelect(this);
                this.nextSibling.classList.toggle("hidden");
                this.classList.toggle("select-arrow-active");
            });
        }

        function closeAllSelect(element) {
            /*a function that will close all select boxes in the document,
            except the current select box:*/
            let x, y, i, arrNo = [];
            x = document.getElementsByClassName("select-items");
            y = document.getElementsByClassName("select-selected");
            for (i = 0; i < y.length; i++) {
                if (element === y[i]) {
                    arrNo.push(i)
                } else {
                    y[i].classList.remove("select-arrow-active");
                }
            }
            for (i = 0; i < x.length; i++) {
                if (arrNo.indexOf(i)) {
                    x[i].classList.add("hidden");
                }
            }
        }

        /*if the user clicks anywhere outside the select box,
        then close all select boxes:*/
        document.addEventListener("click", closeAllSelect);
    })();

    //listens to window resize and loaded events to manage the empty rows of the table
    optimizedResize.add(() => TableManager.fillEmpty());
    window.addEventListener("DOMContentLoaded", () => TableManager.fillEmpty());

    //change layout to non-logged in state
    changePageOnLoginState();

    //then query server for current loginState of this device
    SessionManager.isLoggedIn().then(logged_in => {
        changePageOnLoginState();

        if (logged_in) {

        }
    }).catch(error => {
        console.log(error);
    });
})();

/**
 *
 * @param inp
 * @param arr
 */
function autoComplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    let currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function () {
        let a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) {
            return false;
        }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (arr[i].substr(0, val.length).toUpperCase() === val.toUpperCase()) {
                /*create a DIV element for each matching element:*/
                b = document.createElement("DIV");
                /*make the matching letters bold:*/
                b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                b.innerHTML += arr[i].substr(val.length);
                /*insert a input field that will hold the current array item's value:*/
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function () {
                    /*insert the value for the autocomplete text field:*/
                    inp.value = this.getElementsByTagName("input")[0].value;
                    /*close the list of autocompleted values,
                    (or any other open lists of autocompleted values:*/
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.key === "ArrowDown") {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus letiable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.key === "ArrowUp") { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus letiable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.key === "Enter") {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
                /*and simulate a click on the "active" item:*/
                if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        let x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt !== x[i] && elmnt !== inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

/**
 * Modifies the current webPage.
 * Removes/Adds elements viewable only when one is NOT logged in
 * and Removes/Adds elements viewable only when one IS logged in
 * depending on the parameter.
 */
function changePageOnLoginState() {
    if (SessionManager.loggedIn) {
        showLoginMode();
    } else {
        showLogOutMode();
    }
}

function showLoginMode() {
    //hide logout specific elements
    document.querySelector(".register.btn").classList.add("hidden");
    document.querySelector(".login.btn").classList.add("hidden");

    //show login specific elements
    document.querySelector(".settings.btn").classList.remove("hidden");
    document.querySelector(".logout.btn").classList.remove("hidden");
    document.querySelector(".add-list.btn").classList.remove("hidden");
    document.querySelector(".add-medium.btn").classList.remove("hidden");

    document.querySelectorAll(".user").forEach(value => value.classList.remove("hidden"));
}

function showLogOutMode() {
    //hide login specific elements
    document.querySelector(".settings.btn").classList.add("hidden");
    document.querySelector(".logout.btn").classList.add("hidden");
    document.querySelector(".add-list.btn").classList.add("hidden");
    document.querySelector(".add-medium.btn").classList.add("hidden");

    document.querySelectorAll(".user").forEach(value => value.classList.add("hidden"));

    //show logout specific elements
    document.querySelector(".register.btn").classList.remove("hidden");
    document.querySelector(".login.btn").classList.remove("hidden");

}

/**
 *
 * @param element
 * @return {number}
 */
function indexOf(element) {
    //todo what the hell is this?
    let index = 0;
    let previous = element.previousElementSibling;

    while (previous) {
        previous = previous.previousElementSibling;
        index++;
    }
    return index;
}

/**
 * Check if the given object is an empty one.
 *
 * @param {Object} param
 * @return {boolean}
 */
function empty(param) {
    // noinspection EqualityComparisonWithCoercionJS
    if (param == false || param == undefined) {
        return true;
    }
    return Object.keys(param).length === 0;
}

function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

/**
 * @typedef {Object} Medium
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
 * @property {Array<Part>} parts
 */

/**
 * @typedef {Object} Part
 *
 * @property {number} id
 * @property {string| undefined} title
 * @property {number} totalIndex
 * @property {number| undefined} partialIndex
 * @property {Array<Episode>} episodes
 */

/**
 * @typedef {Object} Episode
 *
 * @property {number} id
 * @property {string|undefined} title
 * @property {number} totalIndex
 * @property {number|undefined} partialIndex
 * @property {string} url
 * @property {string} releaseDate
 */

/**
 * @typedef {Object} List
 *
 * @property {number} id
 * @property {string} name
 * @property {number} medium
 * @property {Array<number>} items
 */

/**
 * @typedef {Object} User
 *
 * @property {string} uuid
 * @property {string} name
 * @property {Array<ExternalUser>} external_user
 * @property {Array<List>} lists
 */

/**
 * @typedef {Object} ExternalList
 *
 * @property {number} id
 * @property {string} name
 * @property {number} medium
 * @property {string} url
 * @property {Array<number>} items
 */

/**
 * @typedef {Object} ExternalUser
 *
 * @property {string} uuid
 * @property {string} name
 * @property {number} service
 * @property {string|undefined| null} cookies
 * @property {Array<ExternalList>} lists
 */