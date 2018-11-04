/**
 * @typedef function ReadInput
 *
 * @param {HTMLElement} element
 * @return {*}
 */

/**
 * @typedef function ResetInput
 *
 * @param {HTMLElement} element
 */

/**
 * @typedef function WriteInput
 *
 * @param {HTMLElement} element
 * @param {*} value
 */

/**
 * @typedef {Object} InputType
 *
 * @property {ReadInput} read
 * @property {ResetInput} reset
 * @property {WriteInput} write
 */

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
class Modal {
    constructor(modal) {
        this.modalSelector = `${modal}.modal`;
        this.element = document.querySelector(this.modalSelector);
        /**
         *
         * @type {Array<Input>}
         */
        this.inputs = [];
    }

    hide() {
        this.element.classList.add("hidden");
        this.reset();
    }

    show() {
        this.element.classList.remove("hidden");
    }

    reset() {
        this.inputs.forEach(value => value.reset());
    }

    /**
     *
     * @return {Promise<void>}
     */
    finish(object) {
        return Promise.resolve(this.inputs.forEach(value => value.write(object)));
    }

    addInput({attr, selector, type, optional = true, validator}) {
        let element = this.element.querySelector(`${this.modalSelector} ${selector}`);
        // noinspection JSCheckFunctionSignatures
        this.inputs.push(new Input(element, type, attr, optional))
    }

    displayError(error) {

    }
}

/**
 *
 * @param {string} modal
 * @return {number}
 */
function getMediaTypes(modal) {
    let types = Object.keys(MediaType);
    let mediumType = 0;

    let mediumChecks = document.querySelectorAll(`${modal} .medium-check-container input`);

    mediumChecks.forEach(value => {
        if (value.checked) {
            let checkedType = value.className.toUpperCase();
            let key = types.find(type => type === checkedType);
            mediumType |= MediaType[key];
        }
    });
    return mediumType;
}

function setMediaTypes(modal, mediaType) {
    let types = Object.keys(MediaType);

    let mediumChecks = document.querySelectorAll(`${modal} .medium-check-container input`);

    mediumChecks.forEach(value => {
        let checkedType = value.className.toUpperCase();
        let key = types.find(type => type === checkedType);
        value.checked = mediaType & MediaType[key] === MediaType[key];
    });
}

class Input {
    /**
     *
     * @param {HTMLElement} element
     * @param {InputType} type
     * @param {string} attr
     * @param {boolean} optional
     */
    constructor(element, type, attr, optional = true) {
        this.element = element;
        /**
         *
         * @type {InputType}
         */
        this.type = type;
        this.attr = attr;
        this.optional = optional;
    }

    /**
     *
     * @param {*} value
     */
    default(value) {
        this.type.write(this.element, value);
    }

    /**
     *
     * @param {Object} obj
     */
    write(obj) {
        let value = this.type.read(this.element);

        if (!value) {
            if (this.optional) {
                return;
            } else {
                throw Error("missing data");
            }
        }

        obj[this.attr] = value;
    }

    reset() {
        this.type.reset(this.element);
    }
}

const Inputs = {
    CHECK: {
        read(element) {
            return element.checked;
        },
        reset(element) {
            element.checked = false;
        },
        write(element, value) {
            element.checked = Boolean(value);
        }
    },
    CHECK_GROUP: {
        read(element) {
            return element.checked;
        },
        reset(element) {
            element.checked = false;
        },
        write(element, value) {
            element.checked = Boolean(value);
        }
    },
    TEXT: {
        read(element) {
            return element.value;
        },
        reset(element) {
            return element.value = "";
        },
        write(element, value) {
            element.value = value;
        }
    },
    SELECT: {
        read(element) {

        },
        reset(element) {

        },
        write(element, value) {

        }
    }
};

class MediumModal extends Modal {
    constructor() {
        super(".add-medium");
        this.addInput({attr: "title", selector: ".input-title input", type: Inputs.TEXT, optional: false});
        this.addInput({
            attr: "medium",
            selector: ".input-medium",
            type: Inputs.CHECK_GROUP,
            optional: false,
            reader: () => getMediaTypes(this.modalSelector),
            writer: () => setMediaTypes(this.modalSelector)
        });

        this.addInput({attr: "author", selector: ".input-author input", type: Inputs.TEXT});
        this.addInput({attr: "artist", selector: ".input-artist input", type: Inputs.TEXT});
        this.addInput({attr: "series", selector: ".input-series input", type: Inputs.TEXT});
        this.addInput({attr: "universe", selector: ".input-universe input", type: Inputs.TEXT});
        this.addInput({attr: "language", selector: ".input-language input", type: Inputs.TEXT});
        this.addInput({attr: "countryOfOrigin", selector: ".input-countryOfOrigin input", type: Inputs.TEXT});
        this.addInput({attr: "languageOfOrigin", selector: ".input-langOfOrigin input", type: Inputs.TEXT});
        this.addInput({attr: "stateTl", selector: ".input-stateTl input", type: Inputs.TEXT});
        this.addInput({attr: "stateOrigin", selector: ".input-stateCOO input", type: Inputs.TEXT});
        this.addInput({attr: "listId", selector: ".input-list", type: Inputs.SELECT});
    }


    show() {
        //fixme if modal is bigger than available height, it is cut off, not scrollable
        let selectContainer = this.element.getElementsByClassName("input-list")[0];
        let listSelect = selectContainer.getElementsByTagName("select")[0];

        user.lists.forEach((value, index) => {
            let element = document.createElement("option");
            element.textContent = value.name;
            element.value = ++index;
            listSelect.appendChild(element);
        });

        enableCustomDropMenu(selectContainer);
        super.show();
    }

    /**
     *
     * @return {Promise<void>}
     */
    finish(object) {
        let medium = Model.createMedium();

        return super
            .finish(medium)
            .then(() => HttpClient.createMedium(medium))
            .then(result => medium.pushMedium(result.listId, result) && undefined);
    }


    reset() {
        super.reset();
        let selectContainer = this.element.getElementsByClassName("input-list")[0];
        let listSelect = selectContainer.getElementsByTagName("select")[0];

        //remove all children except the select
        selectContainer.children.forEach(value => listSelect !== value && value.remove());
        //remove all children, except the first
        listSelect.children.forEach((value, index) => index && value.remove())
    }
}

class LoginModal extends Modal {
    constructor() {
        super(".login");
        this.addInput({attr: "name", selector: ".input-userName input", type: Inputs.TEXT, optional: false});
        this.addInput({attr: "psw", selector: ".input-psw input", type: Inputs.TEXT, optional: false});
    }

    finish(object = {}) {
        return super
            .finish(object)
            .then(() => HttpClient.login(object.name, object.psw));
    }
}

class RegisterModal extends Modal {

    constructor() {
        super(".register");
        this.addInput({attr: "name", selector: ".input-userName input", type: Inputs.TEXT, optional: false});
        this.addInput({attr: "psw", selector: ".input-psw input", type: Inputs.TEXT, optional: false});
        this.addInput({attr: "pswRepeat", selector: ".input-psw-repeat input", type: Inputs.TEXT, optional: false});
    }


    finish(object = {}) {
        return super
            .finish(object)
            .then(() => HttpClient.register(object.name, object.psw, object.pswRepeat));
    }
}

class ListModal extends Modal {
    constructor() {
        super(".add-list");
        this.addInput({attr: "medium", selector: ".input-medium", type: Inputs.CHECK_GROUP, optional: false});
        this.addInput({attr: "name", selector: ".input-name input", type: Inputs.TEXT, optional: false});
    }


    finish(object) {
        let list = Model.createList();

        return super
            .finish(list)
            .then(() => list.addList(list));
    }
}

function initModals() {
    /**
     *
     * @type {Modal[]}
     */
    let modals = [
        new MediumModal(),
        new ListModal(),
        new LoginModal(),
        new RegisterModal(),
    ];

    for (let modal of modals) {
        //finish after finish button is clicked
        let modalElement = modal.element;
        modalElement
            .querySelector(`${modal.modalSelector} .finish`)
            .addEventListener("click", () => modal
                .finish()
                .then(() => modal.hide())
                .catch(error => modal.displayError(error)));

        //show modal after corresponding button is clicked
        document
            .querySelector(`.${modalElement.classList.item(0)}.btn`)
            .addEventListener("click", () => modal.show());

        //add click listener which closes popup if one clicks the close button
        modalElement
            .querySelector(`${modal.modalSelector} .close`)
            .addEventListener('click', () => modal.hide());


        //add click listener which closes popup if one clicks outside the popup box
        window.addEventListener("click", evt => {
            // noinspection JSCheckFunctionSignatures
            if (!modalElement.contains(evt.target) && !modalElement.classList.contains("hidden")) {
                modal.hide();
                evt.stopImmediatePropagation();
            }
        }, {capture: true});
    }
}