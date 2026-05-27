const roleTypeMap = {
    superAdmin: [
        'accounts',
        'room',
        'card',
        'office',
        'food',
        'adhyayan',
        'travel',
        'utsav',
        'avt',
        'wifi'
    ],

    accountsAdmin: ['accounts'],
    roomAdmin: ['room'],
    cardAdmin: ['card'],
    officeAdmin: ['office'],
    foodAdmin: ['food'],
    adhyayanAdmin: ['adhyayan'],
    travelAdmin: ['travel'],
    utsavAdmin: ['utsav'],
    avtAdmin: ['avt'],
    wifiAdmin: ['wifi']
};

let allLinks = [];

const BASE_API =
    `${CONFIG.baseUrl}/short-links`;

const token =
    sessionStorage.getItem('token');

const storedRoles =
    sessionStorage.getItem('roles');



const roles =
    JSON.parse(
        sessionStorage.getItem('roles') || '[]'
    );

let selectedType = 'wifi';

if (
    roles.includes('wifiAdmin')
) {

    selectedType = 'wifi';

} else if (
    roles.includes('avtAdmin')
) {

    selectedType = 'avt';

} else if (
    roles.includes('accountsAdmin')
) {

    selectedType = 'accounts';

} else if (
    roles.includes('roomAdmin')
) {

    selectedType = 'room';

} else if (
    roles.includes('cardAdmin')
) {

    selectedType = 'card';

} else if (
    roles.includes('officeAdmin')
) {

    selectedType = 'office';

} else if (
    roles.includes('foodAdmin')
) {

    selectedType = 'food';

} else if (
    roles.includes('adhyayanAdmin')
) {

    selectedType = 'adhyayan';

} else if (
    roles.includes('travelAdmin')
) {

    selectedType = 'travel';

} else if (
    roles.includes('utsavAdmin')
) {

    selectedType = 'utsav';
}

const API_BASE =
    `${BASE_API}/${selectedType}`;


document.addEventListener(
    'DOMContentLoaded',
    () => {
        populateAllowedTypes();
        fetchLinks();

        document
            .getElementById('searchInput')
            .addEventListener(
                'input',
                applyFilters
            );

        document
            .getElementById('typeFilter')
            .addEventListener(
                'change',
                applyFilters
            );

        document
            .getElementById('statusFilter')
            .addEventListener(
                'change',
                applyFilters
            );

        document
            .getElementById('shortLinkForm')
            .addEventListener(
                'submit',
                createShortLink
            );
    }
);

async function fetchLinks() {

    try {
        const response =
            await fetch(API_BASE, {

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            });

        const data =
            await response.json();
        console.log(data);

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        allLinks =
            data.data || [];

        renderSummary();

        renderLinks(allLinks);

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}

function renderSummary() {

    const total =
        allLinks.length;

    const active =
        allLinks.filter(
            link => link.active
        ).length;

    const inactive =
        total - active;

    const clicks =
        allLinks.reduce(
            (
                total,
                link
            ) => total + (link.click_count || 0),
            0
        );

    document
        .getElementById('summaryCards')
        .innerHTML = `

      <div class="dashboard-card">

        <div class="summary-label">
          Total Links
        </div>

        <div class="summary-value">
          ${total}
        </div>

      </div>

      <div class="dashboard-card">

        <div class="summary-label">
          Active Links
        </div>

        <div class="summary-value">
          ${active}
        </div>

      </div>

      <div class="dashboard-card">

        <div class="summary-label">
          Disabled Links
        </div>

        <div class="summary-value">
          ${inactive}
        </div>

      </div>

      <div class="dashboard-card">

        <div class="summary-label">
          Total Clicks
        </div>

        <div class="summary-value">
          ${clicks}
        </div>

      </div>
    `;
}

function renderLinks(links) {

    const tbody =
        document.querySelector(
            '#linksTable tbody'
        );

    tbody.innerHTML = '';

    if (!links.length) {

        tbody.innerHTML = `

      <tr>

        <td colspan="8">
          No links found
        </td>

      </tr>
    `;

        return;
    }

    links.forEach(
        (
            link,
            index
        ) => {

            const shortUrl =
                `https://aashray.vitraagvigyaan.org/go/${link.slug}`;

            const row =
                document.createElement('tr');

            row.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          ${link.slug}
        </td>

        <td>

          <a
            href="${shortUrl}"
            target="_blank"
            class="short-link"
          >
            ${shortUrl}
          </a>

        </td>

        <td>
          ${link.type}
        </td>

        <td>
          ${link.click_count || 0}
        </td>

        <td>

          ${link.active
                    ? '🟢 Active'
                    : '🔴 Disabled'
                }

        </td>

        <td>

          ${new Date(
                    link.createdAt
                ).toLocaleDateString()}

        </td>

        <td>

          <div class="action-buttons">

            <button
              class="btn btn-primary"
              onclick="
                copyLink(
                  '${shortUrl}'
                )
              "
            >
              Copy
            </button>

            <button
              class="btn btn-primary"
              onclick="
                toggleStatus(
                  ${link.id},
                  ${link.active}
                )
              "
            >

              ${link.active
                    ? 'Disable'
                    : 'Enable'
                }

            </button>

            <button
              class="btn btn-danger"
              onclick="
                deleteLink(
                  ${link.id}
                )
              "
            >
              Delete
            </button>

          </div>

        </td>
      `;

            tbody.appendChild(row);
        }
    );
}

function applyFilters() {

    const search =
        document
            .getElementById('searchInput')
            .value
            .toLowerCase();

    const type =
        document
            .getElementById('typeFilter')
            .value;

    const status =
        document
            .getElementById('statusFilter')
            .value;

    let filtered =
        [...allLinks];

    filtered =
        filtered.filter(
            link => {

                return (

                    link.slug
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    link.target_url
                        ?.toLowerCase()
                        .includes(search)
                );
            }
        );

    if (type !== 'all') {

        filtered =
            filtered.filter(
                link => link.type === type
            );
    }

    if (status === 'active') {

        filtered =
            filtered.filter(
                link => link.active
            );
    }

    if (status === 'inactive') {

        filtered =
            filtered.filter(
                link => !link.active
            );
    }

    renderLinks(filtered);
}

async function createShortLink(e) {

    e.preventDefault();

    try {

        const body = {

            slug:
                document
                    .getElementById('slug')
                    .value
                    .trim(),

            target_url:
                document
                    .getElementById('target_url')
                    .value
                    .trim(),

            type:
                document
                    .getElementById('type')
                    .value
        };

        const response =
            await fetch(API_BASE, {

                method: 'POST',

                headers: {

                    'Content-Type':
                        'application/json',

                    Authorization:
                        `Bearer ${token}`
                },

                body: JSON.stringify(body)
            });

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        alert(
            'Short link created successfully'
        );

        document
            .getElementById(
                'shortLinkForm'
            )
            .reset();

        populateAllowedTypes();
        fetchLinks();

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}

async function copyLink(url) {

    try {

        await navigator.clipboard
            .writeText(url);

        alert(
            'Copied successfully'
        );

    } catch (error) {

        console.error(error);
    }
}

async function toggleStatus(
    id,
    active
) {

    try {

        const response =
            await fetch(

                `${BASE_API}/${id}`,

                {

                    method: 'PUT',

                    headers: {

                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        active: !active
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        fetchLinks();

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}

async function deleteLink(id) {

    try {

        const confirmed =
            confirm(
                'Delete this link?'
            );

        if (!confirmed) {

            return;
        }

        const response =
            await fetch(

                `${BASE_API}/${id}`,

                {
                    method: 'DELETE',

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        fetchLinks();

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}

function getAllowedTypes() {

    const storedRoles =
        sessionStorage.getItem('roles');

    let roles = [];

    try {

        roles =
            JSON.parse(storedRoles);

        if (!Array.isArray(roles)) {

            roles = [roles];
        }

    } catch {

        roles = [storedRoles];
    }

    console.log('roles', roles);

    const allowed =
        new Set();

    roles.forEach(role => {

        if (roleTypeMap[role]) {

            roleTypeMap[role].forEach(type => {

                allowed.add(type);
            });
        }
    });

    console.log(
        'allowedTypes',
        [...allowed]
    );

    return [...allowed];
}

function capitalize(str) {

    return str.charAt(0).toUpperCase()
        + str.slice(1);
}

function populateAllowedTypes() {

    const allowedTypes =
        getAllowedTypes();

    const typeSelect =
        document.getElementById('type');

    const filterSelect =
        document.getElementById('typeFilter');

    const options =
        allowedTypes
            .map(type => `

                <option value="${type}">
                    ${capitalize(type)}
                </option>

            `)
            .join('');

    typeSelect.innerHTML =
        options;

    filterSelect.innerHTML = `

        <option value="all">
            All Types
        </option>

        ${options}
    `;
}
