(() => {
  'use strict';

  function initializePickupMail() {
    const dateInput = document.getElementById('pickupDate');
    const dataInput = document.getElementById('pickupInput');
    const toInput = document.getElementById('pickupTo');
    const ccInput = document.getElementById('pickupCc');
    const preview = document.getElementById('pickupPreview');

    const generateButton =
      document.getElementById('generatePickupBtn');

    const clearButton =
      document.getElementById('clearPickupBtn');

    const copyOpenButton =
      document.getElementById('copyOpenPickupBtn');

    if (
      !dateInput ||
      !dataInput ||
      !preview ||
      !generateButton ||
      !clearButton ||
      !copyOpenButton
    ) {
      console.error('Pickup Mail: Required HTML elements are missing.');
      return;
    }

    // Prevent duplicate event listeners.
    if (generateButton.dataset.pickupInitialized === 'true') {
      return;
    }

    generateButton.dataset.pickupInitialized = 'true';

    const DEFAULT_TO =
      'bhairab.sub-sort@carrybee.com';

    const DEFAULT_CC =
      'Moulvibazar-Barlekha@carrybee.com,' +
      'ruhin.shimul@carrybee.com,' +
      'dipto.d@carrybee.com,' +
      'transport@carrybee.com';

    let generatedMail = null;

    function pad(value) {
      return String(value).padStart(2, '0');
    }

    function escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
    }

    function formatDates(value) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

      if (!match) {
        throw new Error('Select a valid mail date.');
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const date = new Date(0);
      date.setHours(12, 0, 0, 0);
      date.setFullYear(year, month - 1, day);

      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        throw new Error('Select a valid mail date.');
      }

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
      const parcels = new Map();
      const baskets = new Set();
      const runs = new Set();

      const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        const tokens =
          line.toUpperCase().match(/\b[A-Z0-9]+\b/g) || [];

        const lineParcels = tokens.filter(token =>
          /^[EF][A-Z0-9]{8,}$/.test(token)
        );

        const lineBaskets = tokens.filter(token =>
          /^B[A-Z0-9]{8,}$/.test(token)
        );

        const lineRuns = tokens.filter(token =>
          /^\d{4,10}$/.test(token)
        );

        lineBaskets.forEach(id => baskets.add(id));
        lineRuns.forEach(id => runs.add(id));

        for (const id of lineParcels) {
          const row = parcels.get(id) || {
            parcel: id,
            basket: '',
            run: ''
          };

          const basket =
            lineBaskets.length === 1 ? lineBaskets[0] : '';

          const run =
            lineRuns.length === 1 ? lineRuns[0] : '';

          if (
            basket &&
            row.basket &&
            row.basket !== basket
          ) {
            throw new Error(
              `Parcel ${id} has different Basket IDs. ` +
              'Please check the pasted data.'
            );
          }

          if (
            run &&
            row.run &&
            row.run !== run
          ) {
            throw new Error(
              `Parcel ${id} has different RUN IDs. ` +
              'Please check the pasted data.'
            );
          }

          if (basket) {
            row.basket = basket;
          }

          if (run) {
            row.run = run;
          }

          parcels.set(id, row);
        }
      }

      // Use one shared Basket ID or RUN ID wherever it appears.
      const sharedBasket =
        baskets.size === 1 ? [...baskets][0] : '';

      const sharedRun =
        runs.size === 1 ? [...runs][0] : '';

      const rows = [...parcels.values()].map(row => ({
        parcel: row.parcel,
        basket: row.basket || sharedBasket,
        run: row.run || sharedRun
      }));

      return {
        rows,
        parcelCount: parcels.size,
        sackCount: baskets.size
      };
    }

    function resetMail() {
      generatedMail = null;

      preview.innerHTML =
        '<span style="color:#98a2b3;">' +
        'Preview will appear here' +
        '</span>';

      copyOpenButton.style.display = 'none';
    }

    function generateMail() {
      resetMail();

      const input = dataInput.value.trim();
      const date = dateInput.value;

      const to = toInput
        ? toInput.value.trim()
        : DEFAULT_TO;

      const cc = ccInput
        ? ccInput.value.trim()
        : DEFAULT_CC;

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
      let dates;

      try {
        parsed = parsePickupData(input);
        dates = formatDates(date);
      } catch (error) {
        alert(error.message);
        return;
      }

      const { rows, parcelCount, sackCount } = parsed;
      const { shortDate, longDate } = dates;

      if (!parcelCount) {
        alert(
          'No valid pickup parcel ID found. ' +
          'Consignment IDs must start with E or F.'
        );
        return;
      }

      if (!sackCount) {
        alert(
          'No Basket ID found. Add the B IDs anywhere in the ' +
          'pickup data so the sack count can be calculated.'
        );
        return;
      }

      const displayCount = pad(parcelCount);
      const parcelLabel = parcelCount === 1 ? 'Parcel' : 'Parcels';
      const sackLabel = sackCount === 1 ? 'sack' : 'sacks';

      const subject =
        'Merchant Pickup Parcels to Bhairab Sub-Sort from ' +
        `Moulvibazar-Barlekha Hub ${longDate}`;

      const tableRows = rows.map((row, index) => `
        <tr style="background:${index % 2 ? '#f8f8f8' : '#ffffff'};">
          <td style="border:1px solid #d0d0d0;padding:5px 7px;text-align:left;">
            ${escapeHTML(row.parcel)}
          </td>

          <td style="border:1px solid #d0d0d0;padding:5px 7px;text-align:left;">
            ${escapeHTML(row.basket)}
          </td>

          <td style="border:1px solid #d0d0d0;padding:5px 7px;text-align:left;">
            ${escapeHTML(row.run)}
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
                ${['Consignment ID', 'Basket ID', 'RUN ID']
                  .map(label => `
                    <th style="
                      border:1px solid #d0d0d0;
                      padding:6px;
                      background:#2563eb;
                      color:#ffffff;
                      text-align:center;
                    ">
                      ${label}
                    </th>
                  `).join('')}
              </tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top:18px;line-height:1.45;">
            --<br>
            Best Regards,<br>
            <strong>Joy Kanto Dey</strong><br>
            Associate<br>
            OSD Hub Operation | Moulvibazar-Barlekha Hub<br>
            <strong style="color:#f97316;">
              CarryBee Express Ltd.
            </strong><br>
            Cell: 01822140807<br>
            Email: joy.dey@carrybee.com
          </div>
        </div>
      `;

      const textRows = rows.map(row =>
        `${row.parcel}\t${row.basket}\t${row.run}`
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

      generatedMail = {
        html,
        text,
        subject,
        to,
        cc
      };

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

      // Open immediately to avoid popup blocking after clipboard copying.
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
          'https://mail.google.com/mail/u/0/?' +
          parameters.toString();

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
          'Could not copy the mail. ' +
          'Allow clipboard access and try again.'
        );
      } finally {
        copyOpenButton.disabled = false;
        copyOpenButton.textContent = 'Copy & Open Gmail';
      }
    }

    const now = new Date();

    if (!dateInput.value) {
      dateInput.value =
        `${now.getFullYear()}-` +
        `${pad(now.getMonth() + 1)}-` +
        `${pad(now.getDate())}`;
    }

    generateButton.addEventListener('click', generateMail);

    clearButton.addEventListener('click', () => {
      dataInput.value = '';
      resetMail();
    });

    copyOpenButton.addEventListener('click', copyAndOpenGmail);

    for (const input of [
      dataInput,
      dateInput,
      toInput,
      ccInput
    ].filter(Boolean)) {
      input.addEventListener('input', resetMail);
      input.addEventListener('change', resetMail);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initializePickupMail,
      { once: true }
    );
  } else {
    initializePickupMail();
  }
})();
