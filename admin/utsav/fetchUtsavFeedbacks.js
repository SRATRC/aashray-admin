
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

        const foodRating =
            item.answers.find(a => a.question_id === 'food_rating')?.answer || '-';

        const stayRating =
            item.answers.find(a => a.question_id === 'stay_rating')?.answer || '-';

        const eventRating =
            item.answers.find(a => a.question_id === 'event_rating')?.answer || '-';

        const programRating =
            item.answers.find(a => a.question_id === 'program_rating')?.answer || '-';

        const lovedMost =
            item.answers.find(a => a.question_id === 'loved_most')?.answer || '-';

        const suggestions =
            item.answers.find(a => a.question_id === 'improvement_suggestions')?.answer || '-';

        return `

      <tr>

        <td>${index + 1}</td>

        <td>${item.cardno || '-'}</td>

        <td>${item.issuedto || '-'}</td>

        <td>${item.mobno || '-'}</td>

        <td>${item.gender || '-'}</td>

        <td>${item.center || '-'}</td>

        <td>${item.res_status || '-'}</td>

        <td>${item.utsav_name || '-'}</td>

        <td>${formatDateTime(item.createdAt)}</td>

        <td>${foodRating}</td>

        <td>${stayRating}</td>

        <td>${eventRating}</td>

<td>${programRating}</td>

        <td>${lovedMost}</td>

        <td>${suggestions}</td>

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

function openFeedbackModal(feedbackId) {

    const feedback = feedbacks.find(
        (item) => item.id === feedbackId
    );

    if (!feedback) return;

    const container = document.getElementById(
        'feedbackAnswersContainer'
    );

    container.innerHTML = '';

    feedback.answers.forEach((answer) => {

        const div = document.createElement('div');

        div.className = 'feedback-card';

        div.innerHTML = `
      <h4>
        ${answer.question_text}
      </h4>

      <p>
        <strong>Answer:</strong>
        ${answer.answer}
      </p>
    `;

        container.appendChild(div);

    });

    document.getElementById(
        'feedbackModal'
    ).style.display = 'block';

}

function closeFeedbackModal() {

    document.getElementById(
        'feedbackModal'
    ).style.display = 'none';

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

function setupDownloadButton() {
    document.getElementById(
        'downloadBtnContainer'
    ).innerHTML = '';

    renderDownloadButton({
        selector: '#downloadBtnContainer',

        getData: () => {

            return feedbacks.map((item, index) => {

                const foodRating =
                    item.answers.find(
                        a => a.question_id === 'food_rating'
                    )?.answer || '-';

                const stayRating =
                    item.answers.find(
                        a => a.question_id === 'stay_rating'
                    )?.answer || '-';

                const eventRating =
                    item.answers.find(
                        a => a.question_id === 'event_rating'
                    )?.answer || '-';

                const programRating =
                    item.answers.find(
                        a => a.question_id === 'program_rating'
                    )?.answer || '-';

                const lovedMost =
                    item.answers.find(
                        a => a.question_id === 'loved_most'
                    )?.answer || '-';

                const suggestions =
                    item.answers.find(
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