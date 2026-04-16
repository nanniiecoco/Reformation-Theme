/**
 *  @class
 *  @function  CustomerMain
 */

class CustomerMain {
  constructor() {
    this.endPointMiddleware = window?.shopGlobalConfig?.middlewareUrl || "https://middleware-staging.jaspal.com";
    this.storeCode = window?.shopGlobalConfig?.countryCode || "JASPAL";
    this.editWrap = document.querySelector('.edit-wrap');
    this.saveWrap = document.querySelector('.save-wrap');
    this.btnEdit = document.querySelector('.btn-edit');
    this.btnSave = document.querySelector('.btn-save');
    this.btnCancel = document.querySelector('.btn-cancel');
    this.sizePreferenceTable = document.querySelector('.size-preference-table');
    this.selectSize = this.sizePreferenceTable 
        ? this.sizePreferenceTable.querySelectorAll('.select-size') 
        : [];

    // Add functionality to buttons
    if (this.btnEdit) {
      this.btnEdit.addEventListener('click', (e) => this.editSizePreference());
    }
    if (this.btnSave) {
      this.btnSave.addEventListener('click', (e) => this.saveSizePreference());
    }
    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', (e) => this.cancelSizePreference());
    }
  }

  editSizePreference() {
    this.editWrap.classList.add('hidden');
    this.saveWrap.classList.remove('hidden');

    this.selectSize.forEach(el => {
      el.removeAttribute('disabled');
    });
  }

  saveSizePreference() {
    this.actionSaveCancel();
    this.updateSizePreference();
  }

  cancelSizePreference() {
    this.actionSaveCancel()
  }

  actionSaveCancel() {
    this.saveWrap.classList.add('hidden');
    this.editWrap.classList.remove('hidden');

    this.selectSize.forEach(el => {
      el.setAttribute('disabled', 'disabled');
    });
  }

  updateSizePreference() {
    const rows = this.sizePreferenceTable.querySelectorAll("tbody tr");
    let dataSizeArray = []; 

    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const categoryValue = cells[0].textContent.trim();
        const sizeValue = cells[1].querySelector('.select-size').value;
        const savedSizeValue = cells[2].querySelector('a').textContent.trim();
        dataSizeArray.push({
          category: categoryValue,
          size: sizeValue,
          'size saved product': savedSizeValue
        });
      }
    });

    const url = `${this.endPointMiddleware}/webhook/update-variant-by-customer?storeCode=${this.storeCode}`;
    const customerId = document.getElementById('customer-id')?.value || '';
    const payload = {
      customer: customerId,
      variant: JSON.stringify(dataSizeArray)
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => console.log('Success:', data))
      .catch(error => console.error('Error:', error));
  }
}

window.addEventListener('load', () => {
  if (typeof CustomerMain !== 'undefined') {
    new CustomerMain();
  }
  
});