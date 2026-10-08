/* Depends on common.js:
   pad, formatDateLong, formatDateShort, copyRichHTML
*/

let returnMailHTML = '';
let returnMailText = '';
let returnSubject = '';
let returnMailReady = false;

const RETURN_TO =
  'return@carrybee.com,centralsort@carrybee.com';

const RETURN_CC =
  'Moulvibazar-Barlekha@carrybee.com,' +
  'ruhin.shimul@carrybee.com,' +
  'dipto.d@carrybee.com,' +
  'transport@carrybee.com,' +
  'bhairab.sub-sort@carrybee.com';

const returnInput = document.getElementById('returnInput');
const returnDate = document.getElementById('returnDate');
const returnPreview = document.getElementById('returnPreview');
const copyOpenReturnBtn = document.getElementById('copyOpenReturnBtn');

function escapeReturnHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function parseReturnData(text) {
  const rows = [];
  const consignmentIds = new Set();
  const basketIds = new Set();

  let current = {};

  function saveCurrent() {
    // Basket or RUN alone must not create a parcel row.
    if (current.consignment) {
      rows.push({ ...current });
    }
    current = {};
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const tokens = line.toUpperCase().match(/\b[A-Z0-9]+\b/g) || [];

    for (const token of tokens) {
      // Consignment ID starts with R.
      if (/^R[A-Z0-9]{8,}$/.test(token)) {
        saveCurrent();
        current.consignment = token;
        consignmentIds.add(token);
      }

      // Basket ID starts with B.
      else if (/^B[A-Z0-9]{8,}$/.test(token)) {
        current.basket = token;
        basketIds.add(token);
      }

      else if (/^\d{4,10}$/.test(token)) {
        current.run = token;
      }
    }
  }

  saveCurrent();

  // Remove exact duplicate rows.
  const seenRows = new Set();

  const uniqueRows = rows.filter(row => {
    const key = JSON.stringify([
      row.consignment,
      row.basket || '',
      row.run || ''
    ]);

    if (seenRows.has(key)) {
      return false;
    }

    seenRows.add(key);
    return true;
  });

  return {
    rows: uniqueRows,
    consignmentCount: consignmentIds.size,
    basketCount: basketIds.size
  };
}

function resetReturnMail() {
  returnMailHTML = '';
  returnMailText = '';
  returnSubject = '';
  returnMailReady = false;

  returnPreview.innerHTML =
    '<span style="color:#98a2b3">Preview will appear here</span>';

  copyOpenReturnBtn.style.display = 'none';
}

function generateReturnMail() {
  resetReturnMail();

  const input = returnInput.value.trim();
  const date = returnDate.value;

  if (!input) {
    alert('Paste return data first.');
    return;
  }

  if (!date) {
    alert('Select the mail date.');
    return;
  }

  const { rows, consignmentCount, basketCount } =
    parseReturnData(input);

  if (!consignmentCount) {
    alert('No valid consignment ID found. Consignment IDs must start with R.');
    return;
  }

  if (!basketCount) {
    alert('No valid basket ID found. Basket IDs must start with B.');
    return;
  }

  const shortDate = formatDateShort(date);
  const longDate = formatDateLong(date);

  const parcelLabel = consignmentCount === 1 ? 'parcel' : 'parcels';
  const basketLabel = basketCount === 1 ? 'basket' : 'baskets';

  const transferMessage =
    `We are transferring ${consignmentCount} return ${parcelLabel} ` +
    `in ${basketCount} ${basketLabel} from the Moulvibazar-Barlekha Hub ` +
    `via Linehaul-13.1.`;

  returnSubject =
    `Return Parcels Sending to Central Sort from ` +
    `Moulvibazar-Barlekha Hub ${longDate}`;

  const tableRows = rows.map((row, index) => `
    <tr style="background:${index % 2 ? '#f8f8f8' : '#ffffff'}">
      <td style="border:1px solid #d0d0d0;padding:5px 7px;">
        ${escapeReturnHTML(row.consignment)}
      </td>
      <td style="border:1px solid #d0d0d0;padding:5px 7px;">
        ${escapeReturnHTML(row.basket || '')}
      </td>
      <td style="border:1px solid #d0d0d0;padding:5px 7px;">
        ${escapeReturnHTML(row.run || '')}
      </td>
    </tr>
  `).join('');

  returnMailHTML = `
    <div style="
      font-family:Arial,sans-serif;
      font-size:13px;
      color:#111;
      line-height:1.55;
    ">
      <p>Dear Team,</p>

      <p>${escapeReturnHTML(transferMessage)}</p>

      <p>
        Detailed parcel information is provided below for your reference.
      </p>

      <p>
        <strong>Total Consignments:</strong> ${consignmentCount}<br>
        <strong>Total Baskets:</strong> ${basketCount}
      </p>

      <table style="
        border-collapse:collapse;
        width:365px;
        max-width:100%;
        font-family:Arial,sans-serif;
        font-size:13px;
      ">
        <thead>
          <tr>
            <th colspan="3" style="
              border:1px solid #d0d0d0;
              padding:7px;
              background:#eeeeee;
              text-align:center;
              font-weight:bold;
              font-size:14px;
            ">
              ${escapeReturnHTML(shortDate)}
            </th>
          </tr>

          <tr>
            ${['Consignment ID', 'Basket ID', 'RUN ID'].map(label => `
              <th style="
                border:1px solid #d0d0d0;
                padding:6px;
                background:#2563eb;
                color:white;
                text-align:center;
              ">
                ${label}
              </th>
            `).join('')}
          </tr>
        </thead>

        <tbody>${tableRows}</tbody>
      </table>

      <div style="margin-top:18px;line-height:1.45;">
        --<br>
        Best Regards,<br>
        <strong>Joy Kanto Dey</strong><br>
        Associate<br>
        OSD Hub Operation | Moulvibazar-Barlekha Hub<br>
        <strong style="color:#f97316;">CarryBee Express Ltd.</strong><br>
        Cell: 01822140807<br>
        Email: joy.dey@carrybee.com
      </div>
    </div>
  `;

  const textRows = rows.map(row =>
    `${row.consignment}\t${row.basket || ''}\t${row.run || ''}`
  ).join('\n');

  returnMailText = `Dear Team,

${transferMessage}

Detailed parcel information is provided below for your reference.

Total Consignments: ${consignmentCount}
Total Baskets: ${basketCount}

${shortDate}

Consignment ID\tBasket ID\tRUN ID
${textRows}

--
Best Regards,
Joy Kanto Dey
Associate
OSD Hub Operation | Moulvibazar-Barlekha Hub
CarryBee Express Ltd.
Cell: 01822140807
Email: joy.dey@carrybee.com`;

  returnPreview.innerHTML = `
    <div class="subject-preview">
      <b>Subject:</b> ${escapeReturnHTML(returnSubject)}<br>
      <b>To:</b> ${escapeReturnHTML(RETURN_TO)}<br>
      <b>CC:</b> ${escapeReturnHTML(RETURN_CC)}
    </div>

    ${returnMailHTML}
  `;

  returnMailReady = true;
  copyOpenReturnBtn.style.display = 'inline-block';
}

async function copyAndOpenReturnGmail() {
  if (!returnMailReady || copyOpenReturnBtn.disabled) {
    return;
  }

  // Open during the click so awaiting clipboard does not block the popup.
  const gmailWindow = window.open('about:blank', '_blank');

  if (gmailWindow) {
    gmailWindow.opener = null;
  }

  copyOpenReturnBtn.disabled = true;

  try {
    const copied = await copyRichHTML(
      returnMailHTML,
      returnMailText,
      copyOpenReturnBtn
    );

    if (copied === false) {
      throw new Error('Clipboard copy failed.');
    }

    const url =
      'https://mail.google.com/mail/u/0/?view=cm&fs=1' +
      '&to=' + encodeURIComponent(RETURN_TO) +
      '&cc=' + encodeURIComponent(RETURN_CC) +
      '&su=' + encodeURIComponent(returnSubject);

    if (gmailWindow && !gmailWindow.closed) {
      gmailWindow.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (error) {
    if (gmailWindow && !gmailWindow.closed) {
      gmailWindow.close();
    }

    console.error('Could not copy return mail:', error);
    alert('Could not copy the mail. Please allow clipboard access and try again.');
  } finally {
    copyOpenReturnBtn.disabled = false;
    copyOpenReturnBtn.textContent = 'Copy & Open Gmail';
  }
}

const now = new Date();

returnDate.value =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

document.getElementById('generateReturnBtn')
  .addEventListener('click', generateReturnMail);

document.getElementById('clearReturnBtn')
  .addEventListener('click', () => {
    returnInput.value = '';
    resetReturnMail();
  });

copyOpenReturnBtn.addEventListener('click', copyAndOpenReturnGmail);

// Hide outdated mail when input or date changes.
returnInput.addEventListener('input', resetReturnMail);
returnDate.addEventListener('input', resetReturnMail);
