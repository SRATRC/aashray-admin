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
      await fillFormData(packageData);
    } catch (error) {
      console.log('Error while fetching the package data: ' + error);
    }
  };

  const toggleMealFields = () => {
    const startMealGroup = document.getElementById('starting_meal')?.closest('.form-group');
    const endMealGroup = document.getElementById('ending_meal')?.closest('.form-group');
    const endMealSelect = document.getElementById('ending_meal');

    if (!isRC) {
      if (startMealGroup) startMealGroup.style.display = 'none';
      if (endMealGroup) endMealGroup.style.display = 'none';
      return;
    }

    if (startMealGroup) startMealGroup.style.display = '';

    const s = document.getElementById('start_date')?.value;
    const e = document.getElementById('end_date')?.value;

    if (s && e && s === e) {
      if (endMealGroup) endMealGroup.style.display = 'none';
      if (endMealSelect) Array.from(endMealSelect.options).forEach(o => o.selected = false);
    } else {
      if (endMealGroup) endMealGroup.style.display = '';
    }
  };

  document.getElementById('start_date')?.addEventListener('change', toggleMealFields);
  document.getElementById('end_date')?.addEventListener('change', toggleMealFields);

  const fillFormData = async (packageData) => {
    const data = packageData.data;
    document.getElementById('id').value = data.id;
    document.getElementById('name').value = data.name;
    document.getElementById('start_date').value = data.start_date;
    document.getElementById('end_date').value = data.end_date;
    document.getElementById('amount').value = data.amount;

    isRC = data.location === 'Research Centre';

    // Fallback: if data.location was missing, fetch parent utsav directly
    const effectiveUtsavId = utsavId || data.utsavid;
    if (!isRC && effectiveUtsavId) {
      try {
        const uRes = await fetch(`${CONFIG.basePath}/utsav/fetch/${effectiveUtsavId}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          isRC = uData.data?.location === 'Research Centre';
        }
      } catch (err) {
        console.error('Error fetching parent utsav details:', err);
      }
    }

    if (isRC) {
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
    }

    toggleMealFields();

    document.getElementById('saveButton').addEventListener('click', () => {
      updatePackageDetails(document.getElementById('id').value);
    });
  };

  const updatePackageDetails = async (packageId) => {
    const packageFormData = document.getElementById('editPackageForm');
    const packageForm = new FormData(packageFormData);

    const sDate = packageForm.get('start_date');
    const eDate = packageForm.get('end_date');
    const isSameDay = sDate && eDate && sDate === eDate;

    const startMealSelect = document.getElementById('starting_meal');
    const endMealSelect = document.getElementById('ending_meal');

    const startingMeal = (isRC && startMealSelect)
      ? Array.from(startMealSelect.selectedOptions).map(o => o.value)
      : [];
    const endingMeal = (isRC && endMealSelect && !isSameDay)
      ? Array.from(endMealSelect.selectedOptions).map(o => o.value)
      : [];

    const updatedData = {
      name: packageForm.get('name'),
      start_date: sDate,
      end_date: eDate,
      amount: parseFloat(packageForm.get('amount'))
    };

    // Only send meal config when isRC to avoid unintentionally clearing existing values
    if (isRC) {
      updatedData.starting_meal = startingMeal.length ? startingMeal : null;
      updatedData.ending_meal = endingMeal.length ? endingMeal : null;
    }

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
