let logged_in;
//todo loginUser mechanism, check if it was already logged in before
change_login_state(false);

const optimizedResize = (function () {

    let callbacks = [],
        running = false;

    // fired on resize event
    function resize() {

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

    // adds callback to loop
    function addCallback(callback) {

        if (callback) {
            callbacks.push(callback);
        }

    }

    return {
        // public method to add additional callback
        add: function (callback) {
            if (!callbacks.length) {
                window.addEventListener('resize', resize);
            }
            addCallback(callback);
        }
    }
}());

const TableManager = {
    get table() {
        return document.getElementById("list-data");
    },
    get header_container() {
        return document.querySelector("#list-data > thead > tr");
    },

    get rows_container() {
        return document.querySelector("#list-data > tbody");
    },

    data: [],
    data_rows: 0,
    filter: () => true,

    apply_filter(filter) {
        if (typeof (filter) !== "function") {
            throw Error("filter must be a function!")
        }
        this.filter = filter;

        //reset rows
        this.data_rows = 0;
        document.querySelectorAll("#list-data > tbody > tr").forEach(value => value.remove());
        //add whole data with new filter, but do not save it anew
        this.add_data(this.data, false);
    },

    fill_empty() {
        let table = this.table;
        let parent = table.parentElement;
        let parent_size = parseInt(window.getComputedStyle(parent).height);
        let siblings_size = 0;

        for (let child = parent.firstElementChild; child !== null; child = child.nextElementSibling) {
            if (child !== table) {
                siblings_size += parseInt(window.getComputedStyle(child).height);
            }
        }
        let own_size = parseInt(window.getComputedStyle(table).height);
        let remaining = parent_size - own_size - siblings_size;

        //straight skip it if no rows should be added/removed
        if (remaining >= 0 && remaining < 40) {
            return
        }

        //a size of 40px is the size of a cell and with that, the size of a row
        remaining = remaining / 40;

        //check whether there are rows to insert (positive) or remove (negative)
        let abs_remaining = Math.trunc(Math.abs(remaining));
        let rowsContainer = this.rows_container;
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
                for (let j = 0; j < this.header_container.childElementCount; j++) {
                    row.insertCell(-1);
                }
                rowsContainer.appendChild(row);
            }
        }
    },

    add_data(data, push = true) {
        if (push) {
            this.data.push(...data);
        }
        let header = this.header_container.children;
        let rowsContainer = this.rows_container;
        let rows = rowsContainer.children;

        data.forEach(data_row => {
            //check if this data should be displayed
            if (!this.filter(data_row)) {
                return
            }
            //if there are no empty rows, create new ones and fill them with data
            if (rows.length === this.data_rows) {
                let row = document.createElement("tr");

                for (let head of header) {
                    let cell_value = data_row[head.getAttribute("data-name")];

                    if (!cell_value) {
                        cell_value = "-";
                    }

                    row.insertCell(-1).innerText = cell_value;
                }
                rowsContainer.appendChild(row);
                //if there are empty rows available, fill them with data
            } else if (rows.length > this.data_rows) {
                let row = rows[this.data_rows];

                for (let i = 0; i < header.length; i++) {
                    let head = header[i];
                    let cell = row.cells[i];

                    let cell_value = data_row[head.getAttribute("data-name")];

                    if (!cell_value) {
                        cell_value = "-";
                    }

                    cell.innerText = cell_value;
                }
            }
            this.data_rows++;
        });
    },

    clear() {
        //clear current data
        this.data = [];
        this.data_rows = 0;
        //remove all data rows
        document.querySelectorAll("#list-data > tbody > tr").forEach(value => value.remove());
        //fill up the height with empty rows
        this.fill_empty();
    }
};

const ListManager = {
    data: [],

    get list() {
        return document.querySelector("#reading-lists");
    },

    get sorter() {
        return document.querySelector("#sorter");
    },

    add(lists) {
        this.data.push(...lists);
        let list_container = this.list;

        lists.forEach(value => {
            if (value.name) {
                let item = document.createElement("li");

                item.innerText = value.name;
                list_container.appendChild(item);
            } else {
                //remove it from data if it has no name
                this.data.splice(this.data.indexOf(value), 1)
            }
        });
    },

    clear() {
        this.data = [];
        this.list.querySelectorAll("*").forEach(value => value.remove())
    }
};

//listen to window resize and loaded events
optimizedResize.add(() => TableManager.fill_empty());
window.addEventListener("DOMContentLoaded", () => TableManager.fill_empty());
window.addEventListener("message", msg => {
    //accept only messages from this window and location
    if (msg.source && msg.source !== window || msg.origin && msg.origin !== window.location.href) {
        return
    }

    function check(data, attr, success, fail) {
        if (data[attr] !== undefined) {
            if (data[attr]) {
                success();
            } else {
                fail();
            }
        }
    }

    let data = msg.data;
    if (!data) {
        return
    }
    if (data.user) {
        let user = data.user;

        check(user, "logged_in", () => change_login_state(true), () => change_login_state(false));
        check(user, "login", login_succeeded, login_failed);
        check(user, "register", register_succeeded, register_failed);

        if (user._logout) {
            _logout(user._logout.success);
        }
    }

    if (data.data) {
        if (!empty(msg.data) && logged_in) {
            TableManager.add_data(msg.data);
        }
        //todo if data is sent even though user is not logged in, do sth?
    }
    // noinspection JSUnresolvedVariable
    if (data.lists && logged_in) {
        ListManager.add(data.lists);
    }
});

function login_succeeded() {
    document.querySelector(".login.modal").classList.add("hidden");
    document.querySelector(".login.modal .input-psw input").value = "";
    document.querySelector(".login.modal .input-mail input").value = "";
}

function login_failed() {
    let mail_input = document.querySelector(".login.modal .input-mail input");
    let psw_input = document.querySelector(".login.modal .input-psw input");
    console.log("failed login")
    //todo implement on fail
}

function register_succeeded() {
    document.querySelector(".register.modal").classList.add("hidden");
    document.querySelector(".register.modal .input-psw input").value = "";
    document.querySelector(".register.modal .input-psw-repeat input").value = "";
    document.querySelector(".register.modal .input-mail input").value = "";
}

function register_failed() {
    let mail_input = document.querySelector(".register.modal .input-mail input");
    let psw_input = document.querySelector(".register.modal .input-psw input");
    let psw_repeat_input = document.querySelector(".register.modal .input-psw-repeat input");
    console.log("failed register")
    //todo implement on fail
}

function login() {
    //need to be logged out to loginUser
    if (logged_in) {
        return
    }
    let mail_input = document.querySelector(".login.modal .input-mail input");
    let psw_input = document.querySelector(".login.modal .input-psw input");

    let msg = {
        user: {
            loginUser: {
                mail: mail_input.value,
                pw: psw_input.value
            }
        }
    };
    console.log(msg);
    sendMessage(msg);
}

function register() {
    //need to be logged out to loginUser
    if (logged_in) {
        return
    }
    let mail_input = document.querySelector(".register.modal .input-mail input");
    let psw_input = document.querySelector(".register.modal .input-psw input");
    let psw_repeat_input = document.querySelector(".register.modal .input-psw-repeat input");

    if (psw_input.value === psw_repeat_input.value) {
        sendMessage({
            user: {
                register: {
                    mail: mail_input.value,
                    pw: psw_input.value
                }
            }
        });
    } else {
        //todo show incorrect password
    }
}

function _logout(logged_out) {
    TableManager.clear();
    ListManager.clear();
    change_login_state(false);

    if (!logged_out) {
        //todo show error msg, but still clear data?
    }
}

function logout() {
    //need to be logged in to logout
    if (!logged_in) {
        return
    }
    sendMessage({user: {logoutUser: true}});
}


function sendMessage(msg) {
    window.postMessage(msg, window.location.href);
}

function change_login_state(new_state) {
    if (new_state === logged_in) {
        return
    }
    logged_in = new_state;

    if (logged_in) {
        document.getElementById("register").classList.add("hidden");
        document.getElementById("login").classList.add("hidden");

        document.getElementById("settings").classList.remove("hidden");
        document.getElementById("logoutUser").classList.remove("hidden");
    } else {
        document.getElementById("register").classList.remove("hidden");
        document.getElementById("login").classList.remove("hidden");

        document.getElementById("settings").classList.add("hidden");
        document.getElementById("logoutUser").classList.add("hidden");
    }
}

(function enable_modality() {
    let modals = document.querySelectorAll(".modal");
    modals.forEach(value => {
        let closeBtn = value.querySelector(".close");

        window.addEventListener("click", evt => {
            // noinspection JSCheckFunctionSignatures
            if (!value.contains(evt.target) && !value.classList.contains("hidden")) {
                value.classList.add("hidden");
                evt.stopImmediatePropagation();
            }
        }, {capture: true});
        closeBtn.addEventListener('click', () => value.classList.add("hidden"));
    });

    document
        .getElementById("register")
        .addEventListener("click", () => document.querySelector(".register.modal").classList.remove("hidden"));

    document
        .getElementById("login")
        .addEventListener("click", () => document.querySelector(".login.modal").classList.remove("hidden"));

    document.getElementById("logoutUser").addEventListener("click", logout);

    document.querySelector(".login.modal .finish").addEventListener("click", login);
    document.querySelector(".register.modal .finish").addEventListener("click", register)
})();

(function enable_filter_buttons() {
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

(function enable_custom_drop_menu() {
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

function indexOf(element) {
    let index = 0;
    let previous = element.previousElementSibling;

    while (previous) {
        previous = previous.previousElementSibling;
    }
    return index;
}

function empty(param) {
    // noinspection EqualityComparisonWithCoercionJS
    if (param == false || param == undefined) {
        return true;
    }
    return Object.keys(param).length === 0;
}