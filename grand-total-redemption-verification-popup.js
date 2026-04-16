class GrandTotalRedemptionVerificationPopup extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.bindEvents();
    }

    bindEvents() {
        const closeBtn = this.querySelector('.close');
        const okBtn = this.querySelector('.ok-button');

        if (closeBtn) {
            closeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.hide();
            });
        }

        if (okBtn) {
            okBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.hide();
            });
        }
    }

    show() {
        this.style.display = 'block';
    }

    hide() {
        this.style.display = 'none';
    }
}

customElements.define('grand-total-redemption-verification-popup', GrandTotalRedemptionVerificationPopup);