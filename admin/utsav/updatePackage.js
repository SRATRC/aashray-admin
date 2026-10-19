document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const packageToEdit = urlParams.get('id');
  const utsavId = urlParams.get('utsavId');

  let isRC = false;

  const fetchPackageDetails = async (packageToEdit) => {
    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/fetchpackage/${packageToEdit}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const packageData = await response.json();
      fillFormData(packageData);
    } catch (error) {
      console.log('Error while fetching the package data: ' + error);
    }
  };

  const fillFormData = (packageData) => {
    const data = packageData.data;
    document.getElementById('id').value = data.id;
    document.getElementById('name').value = data.name;
    document.getElementById('start_date').value = data.start_date;
    document.getElementById('end_date').value = data.end_date;
    document.getElementById('amount').value = data.amount;

    isRC = data.location === 'Research Centre';

    const startMealGroup = document.getElementById('starting_meal')?.closest('.form-group');
    const endMealGroup = document.getElementById('ending_meal')?.closest('.form-group');

    if (isRC) {
      if (startMealGroup) startMealGroup.style.display = '';
      if (endMealGroup) endMealGroup.style.display = '';

      const prefillSelect = (id, values) => {
        if (!values) return;
        let vals = values;
        if (typeof vals === 'string') {
          try { vals = JSON.parse(vals); } catch(e) { vals = []; }
        }
        if (!Array.isArray(vals)) vals = [];
        const select = document.getElementById(id);
        if (!select) return;
        Array.from(select.options).forEach(opt => {
          opt.selected = vals.includes(opt.value);
        });
      };
      prefillSelect('starting_meal', data.starting_meal);
      prefillSelect('ending_meal', data.ending_meal);
    } else {
      if (startMealGroup) startMealGroup.style.display = 'none';
      if (endMealGroup) endMealGroup.style.display = 'none';
    }

    document.getElementById('saveButton').addEventListener('click', () => {
      updatePackageDetails(document.getElementById('id').value);
    });
  };

  const updatePackageDetails = async (packageId) => {
    const packageFormData = document.getElementById('editPackageForm');
    const packageForm = new FormData(packageFormData);

    const startMealSelect = document.getElementById('starting_meal');
    const endMealSelect = document.getElementById('ending_meal');

    const startingMeal = (isRC && startMealSelect)
      ? Array.from(startMealSelect.selectedOptions).map(o => o.value)
      : [];
    const endingMeal = (isRC && endMealSelect)
      ? Array.from(endMealSelect.selectedOptions).map(o => o.value)
      : [];

    const updatedData = {
      name: packageForm.get('name'),
      start_date: packageForm.get('start_date'),
      end_date: packageForm.get('end_date'),
      amount: parseFloat(packageForm.get('amount')),
      starting_meal: startingMeal.length ? startingMeal : null,
      ending_meal: endingMeal.length ? endingMeal : null
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/updatepackage/${packageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(updatedData)
        }
      );

      if (response.ok) {
        alert('Utsav Package details updated successfully!');
        window.location.href = 'fetchAllUtsav.html';
      } else {
        const data = await response.json();
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error while updating the package data: ' + error);
    }
  };

  if (packageToEdit) {
    fetchPackageDetails(packageToEdit);
  } else {
    console.warn('No package ID specified in URL.');
  }
});
