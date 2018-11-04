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
     * @param {Array<Medium|number>} data
     * @param {boolean} push
     */
    addData(data, push = true) {
        if (push) {
            this.data.push(...data);
        }
        let header = this.headerContainer.children;
        let rowsContainer = this.rowsContainer;
        let rows = rowsContainer.children;

        //load media if data element is an id
        data = data
            .map(value => {
                if (Number.isInteger(value)) {
                    value = user.media.find(medium => medium.id === value);
                }
                if (this.data.includes(value)) {
                    return false;
                }
                return value;
            })
            .filter(value => value);

        data.forEach(dataItem => {
            //check if this data should be displayed
            if (!this.filter(dataItem)) {
                return
            }
            //if there are no empty rows, create new ones and fill them with data
            if (rows.length === this.data_rows) {
                let row = document.createElement("tr");
                let rowItem = {element: row, id: dataItem.id};

                for (let head of header) {
                    let attribute = head.getAttribute("data-name");
                    let cell_value = dataItem[attribute];

                    if (!cell_value) {
                        cell_value = "-";
                    }

                    let cell = row.insertCell(-1);
                    cell.innerText = cell_value;
                    rowItem[attribute] = cell;
                }
                rowsContainer.appendChild(row);
                this.rows.push(rowItem);

                //if there are empty rows available, fill them with data
            } else if (rows.length > this.data_rows) {
                let row = rows[this.data_rows];
                let rowItem = {element: row, value: dataItem};

                for (let i = 0; i < header.length; i++) {
                    let head = header[i];
                    let cell = row.cells[i];

                    let attribute = head.getAttribute("data-name");
                    let cell_value = dataItem[attribute];

                    if (!cell_value) {
                        cell_value = "-";
                    }

                    cell.innerText = cell_value;
                    rowItem[attribute] = cell;
                }

                this.rows.push(rowItem);
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
        let activeMedia = user.lists.flatMap(value => value.active ? value.items : []);
        let inActiveMedia = data.filter(value => !activeMedia.includes(value));

        this.rows
            .filter(value => inActiveMedia.includes(value.id))
            .forEach(value => value.element.remove());

        let filter = value => !inActiveMedia.includes(value.id);

        this.rows = this.rows.filter(filter);
        this.data = this.data.filter(filter);
    },

    /**
     *
     */
    clear() {
        //clear current data
        this.data.length = 0;
        this.data_rows = 0;
        //remove all data rows
        this.rows.forEach(value => value.element.remove());
        this.rows.length = 0;
        //fill up the height with empty rows
        this.fillEmpty();
    }
};

/**
 * Object which handles all operations on the reading list.
 *
 * @type {{
 * data: Array<List>,
 * list: HTMLElement,
 * sorter: HTMLElement,
 * addLists(...List): void,
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
    addLists(lists) {
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
                list.active = item.classList.toggle("active");
            });
            list_container.appendChild(item);
            this.rows.push({element: item, name: item, id: list.id});
        });
    },

    /**
     *
     * @param {number|HTMLElement|Array<number>|Array<HTMLElement>} list
     */
    removeList(list) {
        if (Number.isInteger(list)) {
            this.data = this.data.filter(value => value.id !== list);
            this.rows = this.rows.filter(value => {
                if (value.id !== list) {
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

/**
 *
 * @param {User} user
 */
function bindUser(user) {
    user.addListener(
        "name",
        (oldValue, newValue) =>
            document
                .querySelectorAll(".user")
                .forEach(value => value.textContent = newValue)
    );

    user.lists.addListener(change => {
        if (change.wasAdded()) {
            change.added.forEach(list => bindList(list));
            ListManager.addLists(change.added);
        }
        if (change.wasRemoved()) {

        }
    });

    user.external_user.addListener(change => {
        if (change.wasAdded()) {
            change.added.forEach(user => bindExternalUser(user));
        }
        if (change.wasRemoved()) {

        }
    });

    user.media.addListener(change => {
        if (change.wasAdded()) {
            change.added.forEach(medium => bindMedium(medium));
        }
        if (change.wasRemoved()) {

        }
    });

    user.addListener("session", () => changePageOnLoginState());
}

/**
 *
 * @param {List} list
 */
function bindList(list) {
    //remove list data if list is not active anymore
    //or add it´s data if it is active again
    list.addListener("active", (oldValue, newValue) => {
        if (!oldValue && newValue) {
            TableManager.addData(list.items);
        } else if (oldValue && !newValue) {
            TableManager.removeData(list.items);
        }
    });

    //change the displayed name of the list
    list.addListener("name", (oldValue, newValue) => {
        let rowItem = ListManager.rows.find(value => value.id === list.id);
        rowItem.name.textContent = newValue;
    });

    //if list is active,
    //add new media to table,
    //remove old media from the table
    list.items.addListener(change => {
        if (list.active) {
            if (change.wasAdded()) {
                TableManager.addData(change.added);
            } else if (change.wasRemoved()) {
                TableManager.removeData(change.removed);
            }
        }
    });
}

/**
 *
 * @param {Medium} medium
 */
function bindMedium(medium) {
    medium.addListener("title", (oldValue, newValue) => {

    });
    medium.addListener("author", (oldValue, newValue) => {

    });
    medium.addListener("artist", (oldValue, newValue) => {

    });
    medium.addListener("series", (oldValue, newValue) => {

    });
    medium.addListener("universe", (oldValue, newValue) => {

    });
    medium.addListener("stateOrigin", (oldValue, newValue) => {

    });
    medium.addListener("stateTl", (oldValue, newValue) => {

    });
    medium.addListener("languageOfOrigin", (oldValue, newValue) => {

    });
    medium.addListener("countryOfOrigin", (oldValue, newValue) => {

    });

    function calcLatestEpisode() {
        //todo implement all this shit
        // medium.parts.flatMap(part => part.episodes).reduce((previousValue, currentValue) => )
    }

    medium.parts.addListener(change => {
        if (change.wasAdded()) {
            change.added.forEach(part => {
                bindPart(part);
                // part.episodes.addListener(calcLatestEpisode)
            });
        }
    });
}

/**
 *
 * @param {Part} part
 */
function bindPart(part) {
    part.addListener("title", (oldValue, newValue) => {

    });

    part.episodes.addListener(change => {
        if (change.wasAdded()) {
            change.added.forEach(value => bindEpisode(value))
        }
    })
}

/**
 *
 * @param {Episode} episode
 */
function bindEpisode(episode) {
    episode.addListener("releaseDate", (oldValue, newValue) => {

    });

    episode.addListener("title", (oldValue, newValue) => {

    });
}

/**
 *
 * @param {Medium} medium
 */
function bindExternalUser(medium) {
    //todo implement
}

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
    if (HttpClient.loggedIn) {
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


const Sorter = [{
    alphabetical: {},
    alphabeticalReversed: {},
    source: {},
    sourceReversed: {},
    medium: {},
    mediumReversed: {}
}];
