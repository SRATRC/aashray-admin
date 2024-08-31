document.addEventListener('DOMContentLoaded', () =>{
    const adhyayanListElement = document.getElementById('adhyayanList');
    
    const fetchAdhyayanList = async () => {
        console.log("In Backend Js: Fetching adhyayan data");
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionStorage.getItem('token')}`
            }
        };

        try{
            //ToDo: Update the URL
            var adhyayanList = await fetch(
                'http://localhost:3000/api/v1/admin/adhyayan/fetch',
                options
            );
            console.log("Adhyayan Data received");
            const adhyayanData = await adhyayanList.json();
            console.log(adhyayanData);
            listAdhyayanData(adhyayanData);
        }
        catch (error) {
            console.error("Error fetching data: " + error);
        }
    };

    const listAdhyayanData = (adhyayanData) => {
        const data = adhyayanData.data;
        console.log("Number of adhyayan recieved: " + adhyayanData.data.length);
        console.log("Trying to print the data in table now");
        if(Array.isArray(data)) {
            const itemsToPrint = ["name", "speaker", "start_date", "end_date", "total_seats"];
            console.log("Items array created: " + itemsToPrint);
            var serialNumber = 1;            
            data.forEach((item) => {
                console.log("Processing item: ")
                const tableRow = document.createElement('tr');
                const sNumberField = document.createElement('td');
                sNumberField.classList.add('table-bordered');
                sNumberField.style.textAlign = 'center';
                sNumberField.innerHTML = serialNumber++;
                tableRow.appendChild(sNumberField);
                for(const innerItem in item) {                                       
                    if (itemsToPrint.includes(`${innerItem}`)) {
                        const tableData = document.createElement('td');
                        tableData.classList.add('table-bordered');
                        tableData.style.textAlign = 'center';
                        tableData.innerHTML = `${item[innerItem]}`;
                        tableRow.appendChild(tableData);
                    }
                    /*
                    * We need to create an array of items that are required to be printed.
                    * While going through the json, check if item belongs to above array, if Yes, print it. If No, skip it.
                    * Items required: name, speaker, start_date, end_date, total_seats   
                    * 
                    */
                }
                adhyayanListElement.appendChild(tableRow);
            });
        }
    };

    fetchAdhyayanList();
})