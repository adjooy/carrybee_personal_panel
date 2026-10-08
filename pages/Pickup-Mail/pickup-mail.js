(() => {
  'use strict';

  const dateInput = document.getElementById('pickupDate');
  const dataInput = document.getElementById('pickupInput');
  const toInput = document.getElementById('pickupTo');
  const ccInput = document.getElementById('pickupCc');
  const preview = document.getElementById('pickupPreview');
  const copyOpenButton = document.getElementById('copyOpenPickupBtn');

  let generatedMail = null;

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function formatDates(value) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return {
      shortDate: `${pad(day)}/${pad(month)}/${year}`,
      longDate: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    };
  }

  function parsePickupData(text) {
    const rows = [];
    let current = {};

    function saveCurrent() {
      if (current.parcel) {
        rows.push({ ...current });
      }

      current = {};
    }

    const tokens =
      text.toUpperCase().match(/\b[A-Z0-9]+\b/g) || [];

    for (const token of tokens) {
      // E or F followed by at least 8 letters or numbers.
      if (/^[EF][A-Z0-9]{8,}$/.test(token)) {
        saveCurrent();
        current.parcel = token;
      } else if (/^B[A-Z0-9]{8,}$/.test(token)) {
        current.basket = token;
      } else if (/^\d{4,10}$/.test(token)) {
        current.run = token;
      }
    }

    saveCurrent();

    // Merge repeated parcel entries, but reject conflicting details.
    const parcels = new Map();

    for (const row of rows) {
      const existing = parcels.get(row.parcel);

      if (!existing) {
        parcels.set(row.parcel, { ...row });
        continue;
      }

      for (const field of ['basket', 'run']) {
        if (
          existing[field] &&
          row[field] &&
          existing[field] !== row[field]
        ) {
          throw new Error(
            `Parcel ${row.parcel} has conflicting ${field === 'basket'
              ? 'Basket IDs'
              : 'RUN IDs'}. Please check the pasted data.`
          );
        }

        if (!existing[field] && row[field]) {
          existing[field] = row[field];
        }
      }
    }

    const uniqueRows = [...parcels.values()];

    return {
      rows: uniqueRows,
      parcelCount: uniqueRows.length,
      sackCount: new Set(
        uniqueRows.map(row => row.basket).filter(Boolean)
      ).size
    };
  }

  function resetMail() {
    generatedMail = null;

    preview.innerHTML =
      '<span style="color:#98a2b3;">Preview will appear here</span>';

    copyOpenButton.style.display = 'none';
  }

  function generateMail() {
    resetMail();

    const input = dataInput.value.trim();
    const date = dateInput.value;
    const to = toInput.value.trim();
    const cc = ccInput.value.trim();

    if (!input) {
      alert('Paste pickup data first.');
      return;
    }

    if (!date) {
      alert('Select the mail date.');
      return;
    }

    if (!to) {
      alert('Enter the recipient email address.');
      return;
    }

    let parsed;

    try {
      parsed = parsePickupData(input);
    } catch (error) {
      alert(error.message);
      return;
    }

    const { rows, parcelCount, sackCount } = parsed;

    if (!parcelCount) {
      alert('No valid pickup parcel ID found. IDs must start with E or F.');
      return;
    }

    const missingBasket = rows.find(row => !row.basket);

    if (missingBasket) {
      alert(
        `Basket ID is missing for parcel ${missingBasket.parcel}. ` +
        'Add its B ID after the parcel ID so the sack count is accurate.'
      );
      return;
    }

    const { shortDate, longDate } = formatDates(date);
    const displayCount = pad(parcelCount);
    const parcelLabel = parcelCount === 1 ? 'Parcel' : 'Parcels';
    const sackLabel = sackCount === 1 ? 'sack' : 'sacks';

    const subject =
      `Merchant Pickup Parcels to Bhairab Sub-Sort from ` +
      `Moulvibazar-Barlekha Hub ${longDate}`;

    const tableRows = rows.map((row, index) => `
      <tr style="background:${index % 2 ? '#f8f8f8' : '#ffffff'};">
        <td style="border:1px solid #d0d0d0;padding:5px 7px;">
          ${escapeHTML(row.parcel)}
        </td>
        <td style="border:1px solid #d0d0d0;padding:5px 7px;">
          ${escapeHTML(row.basket)}
        </td>
        <td style="border:1px solid #d0d0d0;padding:5px 7px;">
          ${escapeHTML(row.run || '')}
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="
        font-family:Arial,sans-serif;
        font-size:13px;
        color:#111;
        line-height:1.55;
      ">
        <p>Dear Concerned,</p>

        <p>
          We are sending the mentioned
          <strong>${displayCount} Pickup ${parcelLabel}
          within ${sackCount} ${sackLabel}</strong>
          to Bhairab Sub-Sort from Moulvibazar-Barlekha Hub
          through the transport team under
          <strong>Linehaul-13.1</strong>.
          The parcel details are provided below for your reference.
        </p>

        <p>
          <strong>Total Pickup Parcels:</strong> ${displayCount}<br>
          <strong>Total Sacks:</strong> ${sackCount}
        </p>

        <table class="pickup-table" style="
          border-collapse:collapse;
          width:365px;
          max-width:100%;
          margin-top:14px;
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
                ${escapeHTML(shortDate)}
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
      `${row.parcel}\t${row.basket}\t${row.run || ''}`
    ).join('\n');

    const text = `Dear Concerned,

We are sending the mentioned ${displayCount} Pickup ${parcelLabel} within ${sackCount} ${sackLabel} to Bhairab Sub-Sort from Moulvibazar-Barlekha Hub through the transport team under Linehaul-13.1. The parcel details are provided below for your reference.

Total Pickup Parcels: ${displayCount}
Total Sacks: ${sackCount}

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

    generatedMail = { html, text, subject, to, cc };

    preview.innerHTML = `
      <div class="subject-preview">
        <b>Subject:</b> ${escapeHTML(subject)}<br>
        <b>To:</b> ${escapeHTML(to)}<br>
        <b>CC:</b> ${escapeHTML(cc)}
      </div>

      ${html}
    `;

    copyOpenButton.style.display = 'inline-block';
  }

  async function copyMail(mail) {
    if (
      window.isSecureContext &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem !== 'undefined'
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([mail.html], {
            type: 'text/html'
          }),
          'text/plain': new Blob([mail.text], {
            type: 'text/plain'
          })
        })
      ]);

      return;
    }

    // Fallback for browsers without the modern clipboard API.
    let copied = false;

    function handleCopy(event) {
      if (!event.clipboardData) {
        return;
      }

      event.clipboardData.setData('text/html', mail.html);
      event.clipboardData.setData('text/plain', mail.text);
      event.preventDefault();
      copied = true;
    }

    document.addEventListener('copy', handleCopy);

    try {
      document.execCommand('copy');
    } finally {
      document.removeEventListener('copy', handleCopy);
    }

    if (!copied) {
      throw new Error('Clipboard access is unavailable.');
    }
  }

  async function copyAndOpenGmail() {
    if (!generatedMail || copyOpenButton.disabled) {
      return;
    }

    const mail = { ...generatedMail };
    const gmailWindow = window.open('about:blank', '_blank');

    if (gmailWindow) {
      gmailWindow.opener = null;
    }

    copyOpenButton.disabled = true;
    copyOpenButton.textContent = 'Copying...';

    try {
      await copyMail(mail);

      const parameters = new URLSearchParams({
        view: 'cm',
        fs: '1',
        to: mail.to,
        cc: mail.cc,
        su: mail.subject
      });

      const url =
        'https://mail.google.com/mail/u/0/?' + parameters.toString();

      if (gmailWindow && !gmailWindow.closed) {
        gmailWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (error) {
      if (gmailWindow && !gmailWindow.closed) {
        gmailWindow.close();
      }

      console.error('Could not copy pickup mail:', error);

      alert(
        'Could not copy the mail. Allow clipboard access and try again.'
      );
    } finally {
      copyOpenButton.disabled = false;
      copyOpenButton.textContent = 'Copy & Open Gmail';
    }
  }

  const now = new Date();

  dateInput.value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  document.getElementById('generatePickupBtn')
    .addEventListener('click', generateMail);

  document.getElementById('clearPickupBtn')
    .addEventListener('click', () => {
      dataInput.value = '';
      resetMail();
    });

  copyOpenButton.addEventListener('click', copyAndOpenGmail);

  for (const input of [dataInput, dateInput, toInput, ccInput]) {
    input.addEventListener('input', resetMail);
  }
})();