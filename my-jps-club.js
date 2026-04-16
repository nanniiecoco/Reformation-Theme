class MyJpsClub extends HTMLElement {
    constructor() {
        super();
        this.cardId = this.getAttribute('data-card-id');
        this.customerId = this.getAttribute('data-customer-id');
        this.capillaryLoyaltyType = this.getAttribute('data-capillary-loyalty-type');
        this.capillaryLoyaltyGroup = this.getAttribute('data-capillary-loyalty-group');
        this.availablePointsElement = this.querySelector('.available-points');
        this.eligiblePointsElement = this.querySelector('.eligible-points');
        this.pointsElement = this.querySelector('.points');
        this.redemptionPointsSelectElement = this.querySelector('.redemption-points-select');
        this.cartTotal = this.getAttribute('data-cart-total');
        this.redeemablePriceElement = this.querySelector('.redeemable_price');
        this.currency = this.getAttribute('data-currency');
        this.conversionRate = null;
        this.redeemBtn = this.querySelector('.redeem-btn');
        this.discountAmount = 0;
        this.usedPointsRow = this.querySelector('.used-points-row');
        this.usedPointsValue = this.querySelector('.used-points-value');
        this.redeemBtnContainer = this.querySelector('.redeem-btn-container');
        this.pointNotSufficient = this.querySelector('.point-not-sufficient');
    }

    connectedCallback() {
        if (this.cardId) {
            this.displayPoints(this.cardId);
        }

        if (this.redemptionPointsSelectElement) {
            this.redemptionPointsSelectElement.addEventListener('change', () => this.handleRedemptionPointsSelectChange());
        }

        if (this.redeemBtn) {
            this.updateRedemptionState();
        }
    }

    /** Check if REDEEM coupon exists, update redeemBtn accordingly */
    async updateRedemptionState() {
        // Fetch current cart data from Shopify frontend endpoint
        fetch('/cart.js')
            .then(response => response.json())
            .then(async cart => {
                // Determine where discount/coupon information is present
                const discountArray = cart.cart_level_discount_applications || cart.discount_applications || [];

                // Find a discount whose title or code starts with 'REDEEM'
                const redeemDiscount = discountArray.find(d =>
                    (d.title || d.code)?.startsWith && (d.title || d.code).startsWith('REDEEM')
                );

                if (this.redeemBtn) {
                    if (redeemDiscount) {
                        // Coupon exists, update UI for cancel state
                        const couponCode = redeemDiscount.title || redeemDiscount.code;
                        const button = document.getElementById('redeem-btn');
                        const cancelBtnLabel = button?.dataset?.cancelBtnLabel ?? 'Cancel';
                        this.redeemBtn.innerHTML = '<span class="icon-redeem"></span> <span>' + cancelBtnLabel + '</span>';
                        this.redeemBtn.classList.add('cancel-btn');
                        this.redeemBtn.onclick = (e) => {
                            e.preventDefault();
                            this.redeemBtnContainer.classList.add('loading');
                            this.cancelRedemption(couponCode);
                        };
                        this.redemptionPointsSelectElement.style.display = 'none';

                        this.conversionRate = await this.fetchPointRedemptionConversionRate();

                        // Update the used points value row with current discount amount
                        this.usedPointsValue.innerText =
                            `${cart.attributes.points_redeemed} (Discount ${Number(redeemDiscount.value).toFixed(2)}${this.currency})`;
                        this.usedPointsRow.style.display = '';
                    } else {
                        // Coupon not applied, update UI for redeem state
                        const button = document.getElementById('redeem-btn');
                        const redeemBtnLabel = button?.dataset?.redeemBtnLabel ?? 'Redeem';
                        this.redeemBtn.innerHTML = '<span class="icon-redeem"></span> <span>' + redeemBtnLabel + '</span>';
                        this.redeemBtn.classList.remove('cancel-btn');
                        this.redeemBtn.onclick = (e) => this.handleRedeemClick(e);
                        this.redemptionPointsSelectElement.style.display = '';
                        this.usedPointsRow.style.display = 'none';
                    }
                }
            });
    }

    fetchEligiblePoints(cardId) {
        const apiBaseUrl = window.shopGlobalConfig?.middlewareUrl;
        const storeCode = window.AppConfig?.storeCode;
        const params = new URLSearchParams({card_id: cardId});

        return fetch(`${apiBaseUrl}/webhook/get_points_detail?${params.toString()}&store_code=${storeCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                return data.success ? (data.data?.loyalty_points ?? 0) : 0;
            })
            .catch(error => {
                console.error('Error fetching eligible points:', error);
                return 0;
            });
    }

    fetchPointRedemptionConversionRate() {
        const apiBaseUrl = window.shopGlobalConfig?.middlewareUrl
        const shop = window.Shopify?.shop
        return fetch(`${apiBaseUrl}/webhook/redeem/point-redemption-conversion-rate/get?shop=${shop}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const redemptionConversionRate = data?.[0]?.config?.data;

                if (redemptionConversionRate && Array.isArray(redemptionConversionRate)) {
                    const matched = redemptionConversionRate.find(item => item.capillary_loyalty_type === this.capillaryLoyaltyType);
                    return matched ? matched.rate : 0;
                }
                return 0;
            })
            .catch(error => {
                console.error('Error fetching point redemption conversion rate:', error);
                return 0;
            });
    }

    async handleRedemptionPointsSelectChange() {
        const point = parseInt(this.redemptionPointsSelectElement.value, 10);

        if (isNaN(point)) {
            this.redeemablePriceElement.textContent = '';
            return;
        }

        // Always fetch the latest conversion rate
        try {
            if (this.conversionRate === null) {
                this.conversionRate = await this.fetchPointRedemptionConversionRate();
            }

            this.discountAmount = (point * this.conversionRate) / 100;
            const discountAmountLabel = document.getElementById('redeemable_price')?.dataset?.discountAmountLabel ?? 'Discount amount';
            this.redeemablePriceElement.innerHTML = `${discountAmountLabel}: <span class="text-bold">${this.currency}${this.discountAmount.toFixed(2)}</span>`;
        } catch (error) {
            console.error('Failed to fetch conversion rate:', error);
        }
    }

    displayPoints(cardId) {
        this.fetchEligiblePoints(cardId)
            .then(points => {
                // Update points display for eligibility
                if (this.pointsElement) {
                    this.pointsElement.textContent = points;
                    this.eligiblePointsElement.style.display = '';
                }

                // Update redemption select options and available points
                if (this.availablePointsElement && this.redemptionPointsSelectElement) {
                    const pleaseSelectLabel = document.getElementById('redemption-points-select')?.dataset?.pleaseSelectLabel ?? 'Cancel';
                    // Clear current select options
                    this.redemptionPointsSelectElement.innerHTML = "";
                    this.redemptionPointsSelectElement.innerHTML += '<option value="">' + pleaseSelectLabel + '</option>';

                    if (points >= 400) {
                        // Add 400 points option
                        this.redemptionPointsSelectElement.innerHTML += `<option value="400">400 Points</option>`;
                        this.availablePointsElement.style.display = '';
                    // if (points >= 200) {
                    //     // Add 400 points option
                    //     this.redemptionPointsSelectElement.innerHTML += `<option value="200">200 Points</option>`;
                    //     this.availablePointsElement.style.display = '';

                    //     // Add 800 points option if eligible
                    //     if (points >= 400) {
                    //         this.redemptionPointsSelectElement.innerHTML += `<option value="400">400 Points</option>`;
                    //     }
                        // Add 800 points option if eligible
                        if (points >= 800) {
                            this.redemptionPointsSelectElement.innerHTML += `<option value="800">800 Points</option>`;
                        }

                        // Add custom cart total option if eligible
                        if (Number(points) > 800 && this.cartTotal > 800 && Number(this.cartTotal) < points) {
                            this.redemptionPointsSelectElement.innerHTML +=
                                `<option value="${this.cartTotal}">${this.cartTotal} Points</option>`;
                        }
                    } else {
                        // Not enough points; hide available points element
                        this.availablePointsElement.style.display = 'none';
                        this.redeemBtn.style.display = 'none';
                        this.pointNotSufficient.style.display = '';
                    }
                }
            })
            .catch(error => {
                console.error('Failed to display points:', error);
            });
    }

    async handleRedeemClick(event) {
        event.preventDefault();
        this.redeemBtnContainer.classList.add('loading');
        const pointSelectedOption = this.redemptionPointsSelectElement.value;
        const noPointsError = this.querySelector('.no-points-error');
        noPointsError.style.display = 'none';

        if (!pointSelectedOption || isNaN(parseInt(pointSelectedOption))) {
            const noPointsError = this.querySelector('.no-points-error');
            noPointsError.style.display = '';
            this.redeemBtnContainer.classList.remove('loading')
            return;
        }

        if (this.cartTotal <= this.discountAmount) {
            const popup = document.querySelector('grand-total-redemption-verification-popup');
            if (popup) {
                popup.show();
            }
            this.redeemBtnContainer.classList.remove('loading');
            return;
        }
        this.checkAndGenerateOtp();
    }

    checkAndGenerateOtp(isResendOtp = false) {
        const apiBaseUrl = window.shopGlobalConfig?.middlewareUrl;
        const storeCode = window.AppConfig?.storeCode;
        const cardId = this.cardId;
        return fetch(`${apiBaseUrl}/webhook/redeem/check_and_generate_otp?store_code=${storeCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'card_id': cardId,
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                if (result.success) {
                    if (!isResendOtp) {
                        const otpPopup = document.querySelector('otp-redemption-verification-popup');
                        if (otpPopup) {
                            otpPopup.show(result.data.mobile, result.data.timeAllowShowResend, result.data.timerDuration);
                            this.redeemBtnContainer.classList.remove('loading')
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error check and generate OTP:', error);
            });
    }

    isRedeemable() {
        const apiBaseUrl = window.shopGlobalConfig?.middlewareUrl;
        const storeCode = window.AppConfig?.storeCode;
        const data = {
            points: Number(this.redemptionPointsSelectElement.value),
            external_id: this.cardId,
            customer_id: this.customerId,
            discount_amount: this.discountAmount,
        };

        fetch(`${apiBaseUrl}/webhook/redeem/is_redeemable?store_code=${storeCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    fetch(`/discount/${encodeURIComponent(result.data.coupon_code)}`).then(() => {
                        // Place noteOrderRedemption here, after discount fetch
                        this.addOrderRedemptionNoteAttributes(
                            Number(this.redemptionPointsSelectElement.value),
                            this.cardId,
                            this.capillaryLoyaltyGroup,
                            this.discountAmount,
                            result.data.coupon_code
                        );
                    });
                }
            })
            .catch(error => {
                console.error('Error when calling to is_redeemable api:', error);
            });
    }

    addOrderRedemptionNoteAttributes(pointsRedeemed, externalId, capillaryLoyaltyGroup, discountAmount, couponCode) {
        let data = {
            attributes: {
                "points_redeemed": pointsRedeemed,
                "external_id": externalId,
                "capillary_loyalty_group": capillaryLoyaltyGroup,
                "discount_amount": discountAmount,
                "coupon_code": couponCode
            }
        };

        fetch('/cart/update.js', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(cart => {
                console.log('Note order redemption:', cart);
                window.location.reload();
            })
            .catch(error => {
                console.log('Error when noting order redemption:', error);
                window.location.reload();
            });
    }

    removeOrderRedemptionNoteAttributes() {
        let data = {
            attributes: {
                "points_redeemed": "",
                "external_id": "",
                "capillary_loyalty_group": "",
                "discount_amount": "",
                "coupon_code": ""
            }
        };

        fetch('/cart/update.js', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(cart => {
                console.log('Remove order redemption note:', cart);
                window.location.reload();
            })
            .catch(error => {
                console.log('Error when removing order redemption note:', error);
            });
    }

    cancelRedemption(couponCode) {
        const apiBaseUrl = window.shopGlobalConfig?.middlewareUrl;
        const storeCode = window.AppConfig?.storeCode;
        return fetch(`${apiBaseUrl}/webhook/redeem/cancel?store_code=${storeCode}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({coupon_code: couponCode})
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    fetch("/discount/CLEAR").then(() => {
                        this.removeOrderRedemptionNoteAttributes();
                    });
                }
            })
            .catch(error => {
                console.error('Error when cancelling redemption:', error);
                return 0;
            });
    }
}

customElements.define('my-jps-club', MyJpsClub);