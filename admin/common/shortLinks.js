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

const BASE_API = `${CONFIG.baseUrl}/short-links`;

const token = sessionStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
  populateAllowedTypes();
  fetchLinks();

  document
    .getElementById('searchInput')
    .addEventListener('input', applyFilters);

  document
    .getElementById('typeFilter')
    .addEventListener('change', applyFilters);

  document
    .getElementById('statusFilter')
    .addEventListener('change', applyFilters);

  document
    .getElementById('shortLinkForm')
    .addEventListener('submit', createShortLink);
});

async function fetchLinks() {
  try {
    const allowedTypes = getAllowedTypes();
    const fetchPromises = allowedTypes.map(async (type) => {
      const response = await fetch(`${BASE_API}/${type}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || `Failed to fetch links for type ${type}`
        );
      }
      return data.data || [];
    });

    const results = await Promise.allSettled(fetchPromises);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(
          `Failed to fetch links for type ${allowedTypes[i]}:`,
          r.reason
        );
      }
    });

    allLinks = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)
      .flat();

    renderSummary();
    renderLinks(allLinks);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function renderSummary() {
  const total = allLinks.length;

  const active = allLinks.filter((link) => link.active).length;

  const inactive = total - active;

  const clicks = allLinks.reduce(
    (total, link) => total + (link.click_count || 0),
    0
  );

  document.getElementById('summaryCards').innerHTML = `

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
  const tbody = document.querySelector('#linksTable tbody');
  tbody.innerHTML = '';

  if (!links.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = 'No links found';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  links.forEach((link, index) => {
    const shortUrl = `https://aashray.vitraagvigyaan.org/go/${link.slug}`;
    const row = document.createElement('tr');

    // Column 1: Index
    const tdIndex = document.createElement('td');
    tdIndex.textContent = index + 1;
    row.appendChild(tdIndex);

    // Column 2: Slug
    const tdSlug = document.createElement('td');
    tdSlug.textContent = link.slug;
    row.appendChild(tdSlug);

    // Column 3: Short URL Link
    const tdShortUrl = document.createElement('td');
    const linkElem = document.createElement('a');
    linkElem.href = shortUrl;
    linkElem.target = '_blank';
    linkElem.className = 'short-link';
    linkElem.textContent = shortUrl;
    tdShortUrl.appendChild(linkElem);
    row.appendChild(tdShortUrl);

    // Column 4: Type
    const tdType = document.createElement('td');
    tdType.textContent = link.type;
    row.appendChild(tdType);

    // Column 5: Click Count
    const tdClicks = document.createElement('td');
    tdClicks.textContent = link.click_count || 0;
    row.appendChild(tdClicks);

    // Column 6: Status
    const tdStatus = document.createElement('td');
    tdStatus.textContent = link.active ? '🟢 Active' : '🔴 Disabled';
    row.appendChild(tdStatus);

    // Column 7: Created Date
    const tdCreated = document.createElement('td');
    tdCreated.textContent = new Date(link.createdAt).toLocaleDateString();
    row.appendChild(tdCreated);

    // Column 8: Action Buttons
    const tdActions = document.createElement('td');
    const btnContainer = document.createElement('div');
    btnContainer.className = 'action-buttons';

    // Copy Button
    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn btn-primary';
    btnCopy.textContent = 'Copy';
    btnCopy.addEventListener('click', () => copyLink(shortUrl));
    btnContainer.appendChild(btnCopy);

    // Disable/Enable Button
    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn btn-primary';
    btnToggle.textContent = link.active ? 'Disable' : 'Enable';
    btnToggle.addEventListener('click', () =>
      toggleStatus(link.id, link.active)
    );
    btnContainer.appendChild(btnToggle);

    // Delete Button
    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-danger';
    btnDelete.textContent = 'Delete';
    btnDelete.addEventListener('click', () => deleteLink(link.id));
    btnContainer.appendChild(btnDelete);

    tdActions.appendChild(btnContainer);
    row.appendChild(tdActions);

    tbody.appendChild(row);
  });
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();

  const type = document.getElementById('typeFilter').value;

  const status = document.getElementById('statusFilter').value;

  let filtered = [...allLinks];

  filtered = filtered.filter((link) => {
    return (
      link.slug?.toLowerCase().includes(search) ||
      link.target_url?.toLowerCase().includes(search)
    );
  });

  if (type !== 'all') {
    filtered = filtered.filter((link) => link.type === type);
  }

  if (status === 'active') {
    filtered = filtered.filter((link) => link.active);
  }

  if (status === 'inactive') {
    filtered = filtered.filter((link) => !link.active);
  }

  renderLinks(filtered);
}

async function createShortLink(e) {
  e.preventDefault();

  try {
    const body = {
      slug: document.getElementById('slug').value.trim(),

      target_url: document.getElementById('target_url').value.trim(),

      type: document.getElementById('type').value
    };

    const response = await fetch(BASE_API, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        Authorization: `Bearer ${token}`
      },

      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert('Short link created successfully');

    document.getElementById('shortLinkForm').reset();

    fetchLinks();
  } catch (error) {
    console.error(error);

    alert(error.message);
  }
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);

    alert('Copied successfully');
  } catch (error) {
    console.error(error);
  }
}

async function toggleStatus(id, active) {
  try {
    const response = await fetch(
      `${BASE_API}/${id}`,

      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',

          Authorization: `Bearer ${token}`
        },

        body: JSON.stringify({
          active: !active
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    fetchLinks();
  } catch (error) {
    console.error(error);

    alert(error.message);
  }
}

async function deleteLink(id) {
  try {
    const confirmed = confirm('Delete this link?');

    if (!confirmed) {
      return;
    }

    const response = await fetch(
      `${BASE_API}/${id}`,

      {
        method: 'DELETE',

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    fetchLinks();
  } catch (error) {
    console.error(error);

    alert(error.message);
  }
}

function getAllowedTypes() {
  const storedRoles = sessionStorage.getItem('roles');
  let roles = [];

  try {
    roles = JSON.parse(storedRoles);
    if (!Array.isArray(roles)) {
      roles = [roles];
    }
  } catch {
    roles = [storedRoles];
  }

  const allowed = new Set();
  roles.forEach((role) => {
    if (roleTypeMap[role]) {
      roleTypeMap[role].forEach((type) => {
        allowed.add(type);
      });
    }
  });

  return [...allowed];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function populateAllowedTypes() {
  const allowedTypes = getAllowedTypes();

  const typeSelect = document.getElementById('type');

  const filterSelect = document.getElementById('typeFilter');

  const options = allowedTypes
    .map(
      (type) => `

                <option value="${type}">
                    ${capitalize(type)}
                </option>

            `
    )
    .join('');

  typeSelect.innerHTML = options;

  filterSelect.innerHTML = `

        <option value="all">
            All Types
        </option>

        ${options}
    `;
}
