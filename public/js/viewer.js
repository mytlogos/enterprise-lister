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
        callbacks.forEach(callback => callback());
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
 * only instance of User which should be used throughout the lifetime.
 *
 * @type {User}
 */
const user = Model.createUser();

//add listener to user
bindUser(user);

//then query server for current loginState of this device
HttpClient.isLoggedIn().then(logged_in => {
    if (logged_in) {

    }
}).catch(error => {
    console.log(error);
});

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


(function setup() {
    /**
     * Enables the register, login popups, e.g. adds listener to show/hide them,
     * and adds login, register, logout functionality to page.
     */
    function initPage() {
        //add functionality to button
        document.querySelector(".logout.btn").addEventListener(
            "click",
            () => HttpClient.logout().finally(() => changePageOnLoginState())
        );

        //fill all media check container with checkboxes
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
    }


    function enableAutoComplete() {

    }

    /**
     * Enable filter buttons, which enact filters on the table´s content.
     */
    function enableFilterButtons() {
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
    }

    try {
        initPage();
    } catch (e) {
        console.log(e);
    }
    try {
        enableAutoComplete();
    } catch (e) {
        console.log(e);
    }
    try {
        enableFilterButtons();
    } catch (e) {
        console.log(e);
    }
    try {
        enableCustomDropMenu();
        enableCustomDropMenu();
        enableCustomDropMenu();
    } catch (e) {
        console.log(e);
    }
    try {
        initModals();
    } catch (e) {
        console.log(e);
    }

    //listens to window resize and loaded events to manage the empty rows of the table
    optimizedResize.add(() => TableManager.fillEmpty());
    window.addEventListener("DOMContentLoaded", () => TableManager.fillEmpty());
})();


/**
 * Enables custom drop menus.
 */
function enableCustomDropMenu() {
    //fixme first drop-down item is partially cutoff,
    //fixme if drop-down is out of screen (in modal only?) it is not scrollable, but cut off

    let j, selectElement, a, b, c;
    /*look for any elements with the class "custom-select":*/

    if (arguments.length) {
        if (arguments[0].classList.contains("select-container")) {
            enableCustom(arguments[0]);
        }
    } else {
        Array.from(document.getElementsByClassName("select-container")).forEach(enableCustom);
    }

    function enableCustom(value) {
        //if value has a descendant with class 'select-selected',
        //then it was already enabled
        if (value.getElementsByClassName("select-selected").length) {
            return;
        }

        selectElement = value.getElementsByTagName("select")[0];
        //if the select has only one option (the display option, not a valid one)
        //ignore this, because options will be loaded late
        if (selectElement.options.length <= 1) {
            return;
        }

        /*for each element, create a new div that will act as the selected item:*/
        a = document.createElement("div");
        a.setAttribute("class", "select-selected");
        a.innerHTML = selectElement.options[selectElement.selectedIndex].innerHTML;
        value.appendChild(a);
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
        value.appendChild(b);
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
}