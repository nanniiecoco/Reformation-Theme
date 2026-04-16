class OtpRedemptionVerificationPopup extends HTMLElement {
    constructor() {
        super();
        this.timerDuration = 0;
        this.timerInterval = null;
        this.countdown = this.timerDuration;
        this.mobileNumber = null;
        this.otpMessage = this.querySelector('.otp-message');
        this.otpModalContent = this.querySelector('.otp-modal-content');
        this.invalidOtpMessage = this.getAttribute('data-invalid-otp-message');
        this.otpSentMessage = this.getAttribute('data-otp-sent-message');
        this.timeAllowToResend = 0;
    }

    connectedCallback() {
        this.bindEvents();
    }

    bindEvents() {
        const closeBtn = this.querySelector('.otp-close');
        closeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.hide();
        });

        const resendOtp = this.querySelector('.resend-otp');
        resendOtp.addEventListener('click', (event) => {
            event.preventDefault();
            this.resendOtp();
        });

        this.querySelectorAll('.otp-inputs input').forEach((input, idx, arr) => {
            input.addEventListener('input', function (e) {
                if (/\D/.test(this.value)) this.value = this.value.replace(/\D/g, '');
                if (this.value && idx < arr.length - 1) arr[idx + 1].focus();
            });
            input.addEventListener('keydown', function (e) {
                if (!(
                    e.key >= '0' && e.key <= '9' ||
                    e.key === "Backspace" ||
                    e.key === "Delete" ||
                    e.key === "ArrowLeft" ||
                    e.key === "ArrowRight" ||
                    e.key === "Tab"
                )) {
                    e.preventDefault();
                }
                if (e.key === 'Backspace' && !input.value && idx > 0) {
                    arr[idx - 1].focus();
                }
            });
        });

        // Submit event for Validate OTP
        const submitBtn = this.querySelector('.otp-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                this.otpModalContent.classList.add('loading');
                const response = await this.validateOtp();
                if (response && response.success) {
                    this.otpMessage.textContent = '';
                    const myJpsClub = document.querySelector('my-jps-club');
                    myJpsClub.isRedeemable();
                } else {
                    this.otpModalContent.classList.remove('loading');
                    this.otpMessage.textContent = this.invalidOtpMessage;
                }
            });
        }
    }

    show(mobileNumber, timeAllowToResend = 30, timerDuration = 300) {
        this.timeAllowToResend = timeAllowToResend;
        this.timerDuration = timerDuration;
        this.mobileNumber = mobileNumber;
        this.style.display = 'block';
        this.querySelector('.otp-mobile-number').textContent = '+66 ******' + String(this.mobileNumber).slice(-4);
        this.resetTimer();
    }

    hide() {
        this.style.display = 'none';
        this.resetInputs();
        this.stopTimer();
    }

    resetTimer() {
        this.countdown = this.timerDuration;
        this.updateTimerDisplay();
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.countdown--;
            this.updateTimerDisplay();
            if (this.countdown <= 0) {
                this.stopTimer();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    updateTimerDisplay() {
        let m = Math.floor(this.countdown / 60).toString().padStart(2, '0');
        let s = (this.countdown % 60).toString().padStart(2, '0');
        this.querySelector('.otp-timer').textContent = `${m}:${s}`;

        if (this.countdown <= this.timerDuration - this.timeAllowToResend) {
            this.querySelector('.otp-resend-row').style.display = 'block';
        }

        if (m === '00' && s === '00') {
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetInputs() {
        this.querySelectorAll('.otp-inputs input').forEach(i => i.value = '');
        this.querySelector('.otp-inputs input').focus();

        this.mobileNumber = null;
        this.otpMessage.textContent = '';
    }


    async validateOtp() {
        const apiBaseUrl = window.shopGlobalConfig?.middlewareUrl;
        const storeCode = window.AppConfig?.storeCode;
        const code = Array.from(this.querySelectorAll('.otp-inputs input'))
            .map(i => i.value).join('');
        const mobileNumber = this.mobileNumber;

        if (!mobileNumber || code.length !== 6 || !/^\d{6}$/.test(code)) {
            return false;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/webhook/redeem/validate_otp?store_code=${storeCode}`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    entityType: "MOBILE",
                    entityValue: mobileNumber,
                    code: code,
                    action: "REGISTRATION",
                })
            });
            if (!response.ok) throw new Error("Validate OTP api error!");
            return await response.json();
        } catch (err) {
            return false;
        }
    }

    resendOtp() {
        // Reset the timer
        this.resetTimer();

        const myJpsClub = document.querySelector('my-jps-club');
        myJpsClub.checkAndGenerateOtp(true);

        // Hide the resend link after clicking
        this.querySelector('.otp-resend-row').style.display = 'none';
        this.otpMessage.textContent = this.otpSentMessage;
    }
}

customElements.define('otp-redemption-verification-popup', OtpRedemptionVerificationPopup);