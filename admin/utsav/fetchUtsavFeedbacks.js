
const urlParams = new URLSearchParams(window.location.search);

const utsavId = urlParams.get('utsav_id');
let feedbacks = [];

document.addEventListener(
    'DOMContentLoaded',
    async function () {

        await fetchFeedbacks();

    }
);

async function fetchFeedbacks() {

    try {

        let url = `${CONFIG.basePath}/utsav/utsav-feedback`;

        if (utsavId) {
            url += `?utsav_id=${utsavId}`;
        }

        const response = await fetch(
            url,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionStorage.getItem('token')}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error! status: ${response.status}`
            );
        }

        const result = await response.json();

        feedbacks = result.data || [];

        renderTable();
        setupDownloadButton();

    } catch (error) {

        console.error(error);

        alert('Failed to fetch feedbacks');

    }

}

function renderTable() {

    const container = document.getElementById('tableContainer');

    container.innerHTML = '';

    const table = document.createElement('table');

    table.className = 'table table-striped table-bordered';

    table.id = 'feedbackTable';

    table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Card No</th>
        <th>Name</th>
        <th>Mobile</th>
        <th>Gender</th>
        <th>Centre</th>
        <th>Residential Status</th>
        <th>Utsav</th>
        <th>Submitted At</th>
        <th>Food</th>
        <th>Stay</th>
        <th>Event Rating</th>
        <th>Program Rating</th>
        <th>Most Loved</th>
        <th>Suggestions</th>
      </tr>
    </thead>

    <tbody>

  ${feedbacks.map((item, index) => {
        const answers = Array.isArray(item.answers) ? item.answers : [];

        const foodRating =
            answers.find(a => a.question_id === 'food_rating')?.answer || '-';

        const stayRating =
            answers.find(a => a.question_id === 'stay_rating')?.answer || '-';

        const eventRating =
            answers.find(a => a.question_id === 'event_rating')?.answer || '-';

        const programRating =
            answers.find(a => a.question_id === 'program_rating')?.answer || '-';

        const lovedMost =
            answers.find(a => a.question_id === 'loved_most')?.answer || '-';

        const suggestions =
            answers.find(a => a.question_id === 'improvement_suggestions')?.answer || '-';

        return `

      <tr>

        <td>${index + 1}</td>

        <td>${escapeHtml(item.cardno || '-')}</td>

        <td>${escapeHtml(item.issuedto || '-')}</td>

        <td>${escapeHtml(item.mobno || '-')}</td>

        <td>${escapeHtml(item.gender || '-')}</td>

        <td>${escapeHtml(item.center || '-')}</td>

        <td>${escapeHtml(item.res_status || '-')}</td>

        <td>${escapeHtml(item.utsav_name || '-')}</td>

        <td>${escapeHtml(formatDateTime(item.createdAt))}</td>

        <td>${escapeHtml(foodRating)}</td>

        <td>${escapeHtml(stayRating)}</td>

        <td>${escapeHtml(eventRating)}</td>

        <td>${escapeHtml(programRating)}</td>

        <td>${escapeHtml(lovedMost)}</td>

        <td>${escapeHtml(suggestions)}</td>

      </tr>

    `;
    }).join('')}

</tbody>
  `;

    container.appendChild(table);

    setTimeout(() => {

        enhanceTable(
            'feedbackTable',
            'tableSearch'
        );

    }, 100);

}

function formatDateTime(dateInput) {

    if (!dateInput) return '-';

    const dateObj = new Date(dateInput);

    if (isNaN(dateObj)) return '-';

    const day = String(dateObj.getDate()).padStart(2, '0');

    const month = String(dateObj.getMonth() + 1).padStart(2, '0');

    const year = dateObj.getFullYear();

    const hours = String(dateObj.getHours()).padStart(2, '0');

    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;

}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setupDownloadButton() {
    document.getElementById(
        'downloadBtnContainer'
    ).innerHTML = '';

    renderDownloadButton({
        selector: '#downloadBtnContainer',

        getData: () => {

            return feedbacks.map((item, index) => {
                const answers = Array.isArray(item.answers) ? item.answers : [];

                const foodRating =
                    answers.find(
                        a => a.question_id === 'food_rating'
                    )?.answer || '-';

                const stayRating =
                    answers.find(
                        a => a.question_id === 'stay_rating'
                    )?.answer || '-';

                const eventRating =
                    answers.find(
                        a => a.question_id === 'event_rating'
                    )?.answer || '-';

                const programRating =
                    answers.find(
                        a => a.question_id === 'program_rating'
                    )?.answer || '-';

                const lovedMost =
                    answers.find(
                        a => a.question_id === 'loved_most'
                    )?.answer || '-';

                const suggestions =
                    answers.find(
                        a => a.question_id === 'improvement_suggestions'
                    )?.answer || '-';

                return {
                    sr_no: index + 1,
                    cardno: item.cardno,
                    name: item.issuedto,
                    mobile: item.mobno,
                    gender: item.gender,
                    center: item.center,
                    residential_status: item.res_status,
                    utsav: item.utsav_name,
                    submitted_at: formatDateTime(item.createdAt),
                    food_rating: foodRating,
                    stay_rating: stayRating,
                    event_rating: eventRating,
                    program_rating: programRating,
                    loved_most: lovedMost,
                    suggestions: suggestions
                };

            });

        },

        fileName: `${(
            feedbacks?.[0]?.utsav_name ||
            'utsav'
        )
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            }_feedbacks.xlsx`,

        sheetName: 'Utsav Feedbacks'
    });

}