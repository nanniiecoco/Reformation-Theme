



class RegisterForm {
	constructor() {
		this.endPointMiddleware = window?.shopGlobalConfig?.middlewareUrl || "https://middleware-staging.jaspal.com";
		this.storeCode = window?.shopGlobalConfig?.countryCode || "JASPAL";
		// Check if the form exists
		// Selector register form
		this.form = document.querySelector(".register-form");
		// Selector Register OTP App
		this.thbFormContainer = document.querySelector(".thb-form-container");
		this.isRegisterOtpApp = document.querySelector("#mo-otp-register");

		if (this.isRegisterOtpApp) {
			this.thbFormContainer.classList.add("has-app-otp");
			// Append submit button if motw-items-stretch exists
			this.appendSubmitButton();
			// Listeners
			this.setupEventListeners();
		} else if (this.form) {
			this.thbFormContainer.classList.remove("has-app-otp");
			// Setup default event listeners
			this.setupEventListenersDefault();
		}
	}

	setupEventListeners() {
		// if (this.form) {
		// 	this.form.addEventListener("submit", this.handleSubmit.bind(this));
		// }
		// Add event listener for phone radio toggle
		const phoneRadio = document.querySelector("#phone.motw-peer");
		const emailRadio = document.querySelector("#email.motw-peer");
		const phoneField = document.querySelector(".fields--phone");
		const btnRegister = document.querySelector(".custom-register-btn");
		if (phoneRadio && phoneField) {
			// Initial state
			this.togglePhoneField(phoneRadio, phoneField);
			// Listen for change
			phoneRadio.addEventListener("change", () => {
				this.togglePhoneField(phoneRadio, phoneField);
				if (btnRegister) btnRegister.classList.remove("hidden");
			});
			emailRadio.addEventListener("change", () => {
				this.toggleEmailField(emailRadio, phoneField);
				if (btnRegister) btnRegister.classList.remove("hidden");
			});
		}
		// Add click event for .custom-register-btn to validate form
		if (btnRegister) {
			btnRegister.addEventListener("click", (e) => {
				e.preventDefault();
				this.handleSubmit(e);
			});
		}
	}

	setupEventListenersDefault() {
		if (this.form) {
			this.form.addEventListener("submit", (e) => this.handleSubmitDefault(e));
		}
	}

	togglePhoneField(phoneRadio, phoneField) {
		if (phoneRadio.checked) {
			phoneField.style.display = "none";
		} else {
			phoneField.style.display = "block";
		}
	}

	toggleEmailField(emailRadio, phoneField) {
		if (emailRadio.checked) {
			phoneField.style.display = "flex";
		}
	}

	appendSubmitButton() {
		const container = document.querySelector(".motw-items-stretch");
		if (container && !container.querySelector(".custom-register-btn")) {
			const btn = document.createElement("button");
			btn.type = "submit";
			btn.className = "custom-register-btn";
			btn.textContent = "Continue 2";
			// btn.addEventListener("click", (e) => {
			// 	e.preventDefault();
			// 	this.form.requestSubmit();
			// });
			container.appendChild(btn);
		}
	}

	async validateFormDefault() {
		const formData = new FormData(this.form);
		const firstName = formData.get("customer[first_name]") || "";
		const lastName = formData.get("customer[last_name]") || "";
		const phoneIsdCode = formData.get("customer[note][isd_code]") || "";
		const phone = formData.get("customer[note][phone]") || "";
		const email = formData.get("customer[email]") || "";
		const password = formData.get("customer[password]") || "";
		const errors = [];
		const errorMsg = window.errorMessages;
		
		// Clear old field errors
		this.clearFieldErrors();
		if (!firstName.trim()) {
			errors.push({ field: "first_name", message: errorMsg.firstNameRequired });
		}
		if (!lastName.trim()) {
			errors.push({ field: "last_name", message: errorMsg.lastNameRequired });
		}
		if (!phoneIsdCode.trim()) {
			errors.push({ field: "isd_code", message: errorMsg.isdCodeRequired });
		}
		if (!phone.trim()) {
			errors.push({ field: "phone", message: errorMsg.phoneRequired });
		} else if (phone) {
			const phoneNumber = "+" + phoneIsdCode + phone;
			const exists = await this.checkCustomerExists({ phone: phoneNumber });
			// Validate phone is number && minimum length > 9
			if (!/^\d+$/.test(phone) || phone.length < 9) {
				errors.push({ field: "phone", message: errorMsg.phoneInvalid });
			} else if (phone.startsWith('0')) {
				errors.push({ field: "phone", message: errorMsg.phoneLeadingZero });
			}
			// Check if phone already exists
			else if (exists == 'true') {
				errors.push({ field: "phone", message: errorMsg.phoneExists });
			}
		}
		if (!email.trim()) {
			errors.push({ field: "email", message: errorMsg.emailRequired });
		}
		// if (!password.trim()) {
		// 	errors.push({ field: "password", message: "Password is required." });
		// }
		
		// Validate email format
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.push({ field: "email", message: errorMsg.emailInvalid });
		}
		// Validate password: min 8 chars, upper, lower, number, special char
		const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
		if (!passwordPattern.test(password)) {
			errors.push({
				field: "password",
				message: errorMsg.passwordRequired,
			});
		}
		// Check if email already exists
		if (email) {
			const exists = await this.checkCustomerExists({ email: email });
			if (exists == 'true') {
				errors.push({ field: "email", message: errorMsg.emailExists });
			}
		}
		return errors;
	}

	async validateForm() {
		const formData = new FormData(this.form);
		const phoneRadio = document.querySelector("#phone.motw-peer");
		const emailRadio = document.querySelector("#email.motw-peer");
		const firstName = formData.get("customer[first_name]") || "";
		const lastName = formData.get("customer[last_name]") || "";
		const phoneInput = this.form.querySelector('input[name="customer[note][phone]"]');
		const phoneIsdCode = formData.get("customer[note][isd_code]") || "";
		const phone = formData.get("customer[note][phone]") || "";
		const emailInput = this.form.querySelector('input[name="customer[email]"]');
		const email = formData.get("customer[email]") || "";
		const password = formData.get("customer[password]") || "";
		// get value phone and email outside the form
		const phone2Input = document.querySelector("input.motw-shadow-none.motw-flex-1");
		const phone2IsdCode = document.querySelector(".motw-items-center.motw-border-r.motw-cursor-pointer > span") ? document.querySelector(".motw-items-center.motw-border-r.motw-cursor-pointer > span").textContent : "";
		const phone2 = phone2Input && typeof phone2Input.value === "string" ? phone2Input.value : "";
		const email2Input = document.querySelector('#email[name="email"]');
		const email2 = email2Input && typeof email2Input.value === "string" ? email2Input.value : "";

		const errors = [];

		// Clear old field errors
		this.clearFieldErrors();

		if (!firstName.trim()) {
			errors.push({ field: "first_name", message: "First name is required." });
		}
		if (!lastName.trim()) {
			errors.push({ field: "last_name", message: "Last name is required." });
		}
		if (phoneRadio && phoneRadio.checked) {
			if (phone2Input && (!phone2 || !phone2.trim())) {
				errors.push({ field: "phone2", message: "Phone number is required." });
			} else if (phone2) {
				const phoneNumber2 = "+" + phone2IsdCode + phone2;
				const exists = await this.checkCustomerExists({phone: phoneNumber2});

				// Validate phone2 is number && minimum length > 9
				if (!/^\d+$/.test(phone2) || phone2.length < 9) {
					errors.push({ field: "phone2", message: "Phone number must be 9+ digits, numbers only." });
				}
				// Check if phone2 already exists
				if (exists == 'true') {
					errors.push({ field: "phone2", message: "Phone number already registered." });
				}
			}

			if (emailInput && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
				errors.push({ field: "email", message: "Valid email is required." });
			} else if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				const exists = await this.checkCustomerExists({email: email});
				
				if (exists == 'true') {
					errors.push({ field: "email", message: "Email already registered." });
				}
			}
		} else if (emailRadio && emailRadio.checked) {
			if (phoneInput && (!phone || !phone.trim())) {
				errors.push({ field: "phone", message: "Phone number is required." });
			} else if (phone) {
				const phoneNumber = "+" + phoneIsdCode + phone;
				const exists = await this.checkCustomerExists({phone: phoneNumber});
				
				// Validate phone2 is number && minimum length > 9
				if (!/^\d+$/.test(phone) || phone.length < 9) {
					errors.push({ field: "phone", message: "Phone number must be 9+ digits, numbers only." });
				}
				// Check if phone already exists
				else if (exists == 'true') {
					errors.push({ field: "phone", message: "Phone number already registered." });
				}
			}

			if (email2Input && (!email2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email2))) {
				errors.push({ field: "email2", message: "Valid email is required." });
			} else if (email2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email2)) {
				const exists = await this.checkCustomerExists({email: email2});
				
				if (exists == 'true') {
					errors.push({ field: "email2", message: "Email already registered." });
				}
			}
		}

		// Password: min 8 chars, upper, lower, number, special char
		const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
		if (!passwordPattern.test(password)) {
			errors.push({
				field: "password",
				message:
					"Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.",
			});
		}

		return errors;
	}

	async checkCustomerExists({ email, phone }) {
		try {
			const payload = {};
			if (email) payload.emailAddress = email;
			if (phone) payload.phoneNumber = phone;

			const response = await fetch(`${this.endPointMiddleware}/webhook/search-customer-shopify-by-email-or-phone?storeCode=${this.storeCode}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Requested-With': 'XMLHttpRequest'
				},
				body: JSON.stringify(payload)
			});
			const data = await response.json();
			return data.success;
		} catch (error) {
			console.error('Error checking customer:', error);
			return false;
		}
	}

	clearFieldErrors() {
		// Remove all previous error messages
		const errorMsgs = document.querySelectorAll(".register-field-error");
		errorMsgs.forEach((msg) => msg.remove());
	}

	disableAllFields() {
		// Disable all inputs, selects, and buttons in the form
		const fields = this.form.querySelectorAll("input, select");
		fields.forEach(field => {
			// field.disabled = true;
			field.classList.add('disabled');
		});
	}

	enableAllFields() {
		// Disable all inputs, selects, and buttons in the form
		const fields = this.form.querySelectorAll("input, select");
		fields.forEach(field => {
			// field.disabled = true;
			field.classList.remove('disabled');
		});
	}

	async handleSubmitDefault(e) {
		e.preventDefault();

		const btnSubmit = this.form.querySelector(".button");
		if (btnSubmit) btnSubmit.classList.add("loading");

		// Validate form
		const errors = await this.validateFormDefault();
		this.removeValidationMessages();
		console.log("errors2:", errors);

		if (errors.length > 0) {
			this.enableAllFields()
			this.showValidationMessages(errors);
			if (btnSubmit) btnSubmit.classList.remove("loading");
			return;
		}
		
		// If validation is successful, form is submitted
		if (btnSubmit) btnSubmit.classList.remove("loading");
  		this.form.submit();
	}

	async handleSubmit(e) {
		e.preventDefault();

		const btnRegister = document.querySelector(".custom-register-btn");
		if (btnRegister) btnRegister.classList.add("loading");

		// Validate form
		const errors = await this.validateForm();
		this.removeValidationMessages();
		console.log("errors:", errors);

		if (errors.length > 0) {
			this.enableAllFields()
			this.showValidationMessages(errors);
			if (btnRegister) btnRegister.classList.remove("loading");
			return;
		}

		// Disable all fields when validation is successful
		this.disableAllFields();

		// Use trigger button button.motw-bg-slate-900 to submit the form
		const otpButton = document.querySelector("button.motw-bg-slate-900");
		if (otpButton) {
			// Get custom phone
			const phoneValue = this.form.querySelector(
				'input[name="customer[note][phone]"]'
			).value;
			const isdCodeValue = this.form.querySelector(
				'select[name="customer[note][isd_code]"]'
			).value;

			if (phoneValue && isdCodeValue) {
				// get email to identify user
				const email2Input = document.querySelector('#email[name="email"]');
				localStorage.setItem(
					"phoneRegister",
					JSON.stringify({
						email: email2Input ? email2Input.value : "",
						phone: phoneValue,
						isd_code: isdCodeValue,
					})
				);
			}
			otpButton.click();
			if (btnRegister) {
				// btnRegister.classList.add("hidden");
				btnRegister.classList.remove("loading");
			}
		}
	}

	removeValidationMessages() {
		const oldMsg = document.querySelector(".register-validation-msg, .motw-text-red-500.motw-text-md");
		if (oldMsg) oldMsg.remove();
	}

	showValidationMessages(errors) {
		// Show field-specific errors
		errors.forEach((err) => {
			let fieldWrapper = null;
			let errorElem = document.createElement("div");
			errorElem.className = "register-field-error";
			errorElem.textContent = err.message;

			switch (err.field) {
				case "first_name":
					fieldWrapper = this.form.querySelector(
						"#RegisterForm-FirstName"
					).parentElement;
					break;
				case "last_name":
					fieldWrapper = this.form.querySelector(
						"#RegisterForm-LastName"
					).parentElement;
					break;
				case "email":
					fieldWrapper = this.form.querySelector(
						"#RegisterForm-email"
					).parentElement;
					break;
				case "email2":
					const email2Input = document.querySelector('#email[name="email"]');
					fieldWrapper = email2Input ? email2Input.parentElement : null;
					break;
				case "password":
					fieldWrapper = this.form.querySelector(
						"#RegisterForm-password"
					).parentElement;
					break;
				case "phone":
					fieldWrapper = this.form.querySelector(".fields--phone");
					break;
				case "phone2":
					fieldWrapper = document.querySelector(
						"input.motw-shadow-none.motw-flex-1"
					)
						? document.querySelector("input.motw-shadow-none.motw-flex-1")
								.parentElement.parentElement
						: null;
					break;
			}

			if (fieldWrapper) {
				// Insert error after the field
				fieldWrapper.appendChild(errorElem);
			}
		});
	}
}

// Initialize the form handler
document.addEventListener("DOMContentLoaded", () => {
	new RegisterForm();
});
