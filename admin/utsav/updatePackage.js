document.addEventListener('DOMContentLoaded', () => {
const urlParams = new URLSearchParams(window.location.search);
const packageToEdit = urlParams.get('id');
const utsavId = urlParams.get('utsavId');

console.log('packageToEdit:', packageToEdit);
console.log('utsavId:', utsavId);

  const fetchPackageDetails = async (packageToEdit) => {
    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/fetchpackage/${packageToEdit}`, // Adjust API path if needed
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

    document.getElementById('saveButton').addEventListener('click', () => {
      updatePackageDetails(document.getElementById('id').value);
    });
  };

  const updatePackageDetails = async (packageId) => {
    console.log('Updating Package with Id: ' + packageId);
    console.log('Updating Package with Utsav Id: ' + utsavId);
    const packageFormData = document.getElementById('editPackageForm');
    const packageForm = new FormData(packageFormData);
    const updatedData = {
      name: packageForm.get('name'),
      start_date: packageForm.get('start_date'),
      end_date: packageForm.get('end_date'),
      amount: parseFloat(packageForm.get('amount'))
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/utsav/updatepackage/${packageId}/${utsavId}`, // Adjust API path if needed
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
        const updateResponse = await response.json();
        console.log('Update Response: ', updateResponse);
        alert('Utsav Package details updated successfully!');
        window.location.href = 'fetchAllPackage.html'; // Change to your package list page
      } else {
        const data = await response.json();
        console.error('Update failed:', data.message);
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
