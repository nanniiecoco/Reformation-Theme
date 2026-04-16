/**
 * Manages popup display for Capillary customers
 */
class PopupHandler {
	constructor() {
		// Define base URL and request method for API calls
		// Use global configuration or default values
		this.middeware =
			window?.shopGlobalConfig?.middlewareUrl ||
			"https://middleware-staging.jaspal.com";
		this.countryCode = window?.shopGlobalConfig?.countryCode || "JASPAL";
		this.BASE_URL_SEARCH_CUSTOMER_CAPILLARY =
			this.middeware + "/webhook/search-customer?storeCode=" + this.countryCode;
		this.BASE_URL_SEARCH_AND_SYNC_CUSTOMER_CAPILLARY =
			this.middeware +
			"/webhook/search-and-sync-customer?storeCode=" +
			this.countryCode;
		this.REQUEST_METHOD_SEARCH_CUSTOMER_CAPILLARY = "POST";

		// Configuration constants
		this.STORAGE_KEYS = {
			HIDE_POPUP_PREFIX: "hideCapillaryPopup-",
		};

		this.SELECTORS = {
			POPUP: "#capillaryPopup",
			POPUP_YES: "#popupYes",
			POPUP_NO: "#popupNo",
			CAPILLARY_CHECKBOX: "#capillaryCheckbox",
		};

		// Initialize values
		this.daysForDoNotShowPopup = window.customer.daysForDoNotShowPopup || null;

		// Check popup display conditions
		this.initializePopup();
	}

	/**
	 * Initialize popup and check display conditions
	 */
	async initializePopup() {
		// Check if customer is logged in
		if (!window.customer?.logged_in) {
			// Remove temporary localStorage item if it exists in other pages, not from register form
			const currentPath = window.location.pathname;
			if (
				localStorage.getItem("requestFromRegisterForm") === "1" &&
				currentPath !== "/account/register"
			) {
				localStorage.removeItem("requestFromRegisterForm");
			}

			if (
				localStorage.getItem("phoneRegister") != undefined
			) {
				localStorage.removeItem("phoneRegister");
			}

			return;
		}

		let shouldShowPopup = await this.shouldShowPopup();
		if (shouldShowPopup) {
			this.renderPopup();
		} else {
			const urlParams = new URLSearchParams(window.location.search);
			const isFromLoginPage = urlParams.get("source") === "login";

			if (isFromLoginPage) {
				// Send login data to webhook
				this.sendLoginDataToWebhook(
					window.customer.id,
					window.customer.myjpscard_id
				);
			}
		}

		// Remove temporary localStorage items
		localStorage.removeItem("requestFromRegisterForm");
		localStorage.removeItem("phoneRegister");
	}

	/**
	 * Check conditions for displaying popup
	 * @returns {boolean} - True if popup should be displayed
	 */
	async shouldShowPopup() {
		// Check from register form
		const isFromRegisterForm =
			localStorage.getItem("requestFromRegisterForm") === "1";
		// Check from login form
		const urlParams = new URLSearchParams(window.location.search);
		const isFromLoginPage = urlParams.get("source") === "login";
		// Login case
		if (isFromLoginPage) {
			return this.checkLoginConditions();
		} else if (isFromRegisterForm) {
			// Register case
			return this.checkRegisterConditions();
		}

		return false;
	}

	/**
	 * Check conditions for showing popup after login
	 * @returns {boolean} - True if popup should be shown after login
	 */
	checkLoginConditions() {
		const { existInCapillary, myjpscard_id, id } = window.customer || {};

		// Don't show if not existing in Capillary or already has card ID
		if (!existInCapillary || (existInCapillary && myjpscard_id != null)) {
			return false;
		}

		// Check if popup is currently hidden due to user preference
		const hideUntil =
			localStorage.getItem(`${this.STORAGE_KEYS.HIDE_POPUP_PREFIX}${id}`) ||
			null;
		if (hideUntil && new Date(hideUntil) > new Date()) {
			return false;
		}

		return true;
	}

	/**
	 * Check conditions for showing popup after registration
	 * @returns {boolean} - True if popup should be shown after registration
	 */
	async checkRegisterConditions() {
		let customerId = window.customer?.id || null;
		if (!customerId) {
			return false;
		}
		const existInCapillary = await this.compareCustomerPhoneCapillary(
			customerId
		);

		return existInCapillary.success;
	}

	async compareCustomerPhoneCapillary(customerId) {
		if (customerId === null || customerId === undefined) {
			return false;
		}

		let phoneRegister = localStorage.getItem("phoneRegister");

		try {
			const requestBody = {
				customerId: customerId,
			};

			if (phoneRegister) {
				requestBody.phone = JSON.parse(phoneRegister).phone;
				requestBody.isd_code = JSON.parse(phoneRegister).isd_code;
				requestBody.email = JSON.parse(phoneRegister).email || null;
			}

			const response = await fetch(
				this.BASE_URL_SEARCH_AND_SYNC_CUSTOMER_CAPILLARY,
				{
					method: this.REQUEST_METHOD_SEARCH_CUSTOMER_CAPILLARY,
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				}
			);

			if (!response.ok) {
				return { success: false };
			}

			return await response.json();
		} catch (error) {
			return { success: false };
		}
	}

	/**
	 * Display popup and add event handlers
	 */
	renderPopup() {
		const popupElement = document.querySelector(this.SELECTORS.POPUP);

		if (!popupElement) return;

		// Display popup
		popupElement.style.display = "flex";

		// Add event handlers
		this.addEventListeners();
	}

	/**
	 * Add event listeners to popup elements
	 */
	addEventListeners() {
		const yesButton = document.querySelector(this.SELECTORS.POPUP_YES);
		const noButton = document.querySelector(this.SELECTORS.POPUP_NO);

		if (yesButton) {
			yesButton.addEventListener("click", () => {
				this.handlePopupAction();
				const pathSegments = window.location.pathname.split('/');
                const locale = pathSegments[1] === 'en' || pathSegments[1] === 'th' ? `/${pathSegments[1]}` : '';
                window.location.href = `${locale}/account`;
			});
		}

		if (noButton) {
			noButton.addEventListener("click", () => {
				this.handlePopupAction();
				const popupElement = document.querySelector(this.SELECTORS.POPUP);
				if (popupElement) {
					popupElement.style.display = "none";
				}
			});
		}
	}

	/**
	 * Handle user's action with popup
	 */
	handlePopupAction() {
		if (this.daysForDoNotShowPopup === null) {
			return;
		}

		const checkbox = document.querySelector(this.SELECTORS.CAPILLARY_CHECKBOX);
		if (checkbox?.checked) {
			// Save to localStorage to prevent popup display for a certain period
			const expiryDate = new Date();
			expiryDate.setDate(
				expiryDate.getDate() + parseInt(this.daysForDoNotShowPopup)
			);

			localStorage.setItem(
				`${this.STORAGE_KEYS.HIDE_POPUP_PREFIX}${window.customer.id}`,
				expiryDate.toISOString()
			);
		}
	}

	/**
	 * Send login data to webhook
	 * @param {string|number} customerId - The customer ID
	 * @param {string|null} myjpscardId - The MyJPS card ID if available
	 */
	sendLoginDataToWebhook(customerId, myjpscardId) {
		if (!customerId || !myjpscardId) return;

		// Prepare data
		const data = {
			customer_id: customerId,
			myjpscard_id: myjpscardId || null,
		};

		// Send data to webhook
		let URL =
			this.middeware + "/webhook/handle-login?storeCode=" + this.countryCode;
		fetch(URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				return response.json();
			})
			.then((data) => {
				console.log("Webhook response:", data);
			})
			.catch((error) => {
				console.error("Error sending data to webhook:", error);
			});
	}
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	new PopupHandler();
});
