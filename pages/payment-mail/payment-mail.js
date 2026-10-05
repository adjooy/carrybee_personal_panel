/* Payment Mail Generator — depends on assets/js/common.js (pad, copyRichHTML) */

let paymentMailHTML = '';
let paymentMailText = '';
let paymentSubject = '';

const HUB_NAME = 'Moulvibazar-Barlekha Hub';
const COLLECTION_DAY_OFFSET = 0; // collection date = payment date minus N days (0 hole same din)

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];


/* =========================================================
   PARSE PAYMENT MESSAGE
========================================================= */

function parsePaymentMessage(text){

  const result = { amount:'', time:'', date:'', trx:'' };

  let match =
    text.match(/Pay\s+Bill\s+request\s+of\s+Tk\s*([\d,]+(?:\.\d+)?)/i) ||
    text.match(/Amount\s*[:\-]?\s*(?:Tk\s*)?([\d,]+(?:\.\d+)?)/i);

  if(match) result.amount = match[1].replace(/,/g,'');

  match = text.match(/TrxID\s*[:\-]?\s*([A-Z0-9]+)/i);
  if(match) result.trx = match[1];

  match = text.match(
    /at\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i
  );

  if(match){
    result.date = match[1];
    result.time = match[2].replace(/\s+/g,'');
  }

  return result;
}


/* =========================================================
   HELPERS
========================================================= */

function formatMoney(value){
  const n = Number(value || 0);
  if(Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { maximumFractionDigits:0 });
}

// payment message er date (dd/mm/yy) -> Date object. Na pele aajker date.
function parsePaymentDate(str){

  if(str){
    const p = str.split('/');
    if(p.length === 3){
      let year = parseInt(p[2], 10);
      if(year < 100) year += 2000;
      const d = new Date(year, parseInt(p[1],10) - 1, parseInt(p[0],10));
      if(!Number.isNaN(d.getTime())) return d;
    }
  }

  return new Date();
}

// 01 September 2026
function formatCollectionDate(d){
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}


/* =========================================================
   TABLE BUILDER (Gmail er jonno inline style)
========================================================= */

const CELL   = 'border:1px solid #ccc;padding:5px 8px;';
const HEAD   = 'border:1px solid #999;padding:5px 8px;background:#f2f2f2;';

function tr(label, value, bold){
  const b = bold ? 'font-weight:bold;' : '';
  return `
<tr>
<td style="${CELL}${b}">${label}</td>
<td style="${CELL}text-align:center;${b}">${value}</td>
</tr>`;
}

function th(left, right){
  return `
<tr>
<th style="${HEAD}text-align:left;">${left}</th>
<th style="${HEAD}">${right}</th>
</tr>`;
}


/* =========================================================
   GENERATE MAIL
========================================================= */

function generatePaymentMail(){

  const input = document.getElementById('paymentMessage').value.trim();

  if(!input){
    alert('Paste your payment message first.');
    return;
  }

  const data = parsePaymentMessage(input);

  if(!data.amount || !data.trx){
    alert('Payment amount or Transaction ID could not be detected.');
    return;
  }

  const payDate = parsePaymentDate(data.date);

  const collectionDate = new Date(payDate);
  collectionDate.setDate(collectionDate.getDate() - COLLECTION_DAY_OFFSET);

  const collectionLong = formatCollectionDate(collectionDate);
  const monthYear = `${MONTHS[payDate.getMonth()]} ${payDate.getFullYear()}`;

  const amount = formatMoney(data.amount);
  const time = data.time || '';
  const method = 'Bkash';

  paymentSubject =
    `Daily COD Collection & Payment Submission \u2013 ${HUB_NAME} (${monthYear})`;

  paymentMailHTML = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#111;line-height:1.6">

<p style="margin:0 0 12px 0"><b>Dear Team,</b><br>
This is to inform you that the COD collection for <b>${collectionLong}</b> has been closed and the collected amount has been submitted accordingly.</p>

<table style="border-collapse:collapse;width:350px;font-family:Arial,sans-serif;font-size:13px;">

<tr>
<td colspan="2" style="${HEAD}text-align:center;font-weight:bold;padding:8px;">Collection Summary</td>
</tr>
${th('Particulars','Amount (Tk)')}
${tr('Total COD Collected', amount)}
${tr('Add: Due Amount', '0')}
${tr('Less: Other Cost', '0')}
${tr('Less: Cash in Hand', '0')}
${tr('Petty Cash Withdraw', '0', true)}
${tr('Total Payable', amount, true)}

<tr>
<td colspan="2" style="${CELL}text-align:center;padding:8px;">Payment Details</td>
</tr>
${th('Description','Information')}
${tr('Amount Submitted', amount)}
${tr('Payment Method', method)}
${tr('Transaction ID', data.trx, true)}
${tr('Submission Time', time)}

</table>

<p style="margin:12px 0 0 0">The above amount has been submitted successfully against the day's COD collection.</p>

<p style="margin:12px 0 0 0">Please find the payment details above for your reference and record.</p>

</div>
`;

  paymentMailText =
`Dear Team,
This is to inform you that the COD collection for ${collectionLong} has been closed and the collected amount has been submitted accordingly.

Collection Summary
Particulars\tAmount (Tk)
Total COD Collected\t${amount}
Add: Due Amount\t0
Less: Other Cost\t0
Less: Cash in Hand\t0
Petty Cash Withdraw\t0
Total Payable\t${amount}

Payment Details
Description\tInformation
Amount Submitted\t${amount}
Payment Method\t${method}
Transaction ID\t${data.trx}
Submission Time\t${time}

The above amount has been submitted successfully against the day's COD collection.

Please find the payment details above for your reference and record.`;

  document.getElementById('paymentPreview').innerHTML = `
    <div class="subject-preview">${paymentSubject}</div>
    ${paymentMailHTML}
  `;

  document.getElementById('openPaymentGmail').style.display = 'inline-block';
  document.getElementById('copyPaymentBtn').style.display = 'inline-block';
}


/* =========================================================
   PAYMENT GMAIL
========================================================= */

async function openPaymentGmail(){

  await copyRichHTML(
    paymentMailHTML,
    paymentMailText,
    document.getElementById('copyPaymentBtn')
  );

  const url =
    'https://mail.google.com/mail/u/0/?view=cm' +
    '&fs=1' +
    '&su=' + encodeURIComponent(paymentSubject);

  window.open(url, '_blank');
}


/* =========================================================
   EVENTS
========================================================= */

document.getElementById('generatePaymentBtn')
  .addEventListener('click', generatePaymentMail);

document.getElementById('clearPaymentBtn')
  .addEventListener('click', () => {

    document.getElementById('paymentMessage').value = '';

    document.getElementById('paymentPreview').innerHTML =
      '<span style="color:#98a2b3">Preview will appear here</span>';

    document.getElementById('openPaymentGmail').style.display = 'none';
    document.getElementById('copyPaymentBtn').style.display = 'none';
  });

document.getElementById('openPaymentGmail')
  .addEventListener('click', openPaymentGmail);

document.getElementById('copyPaymentBtn')
  .addEventListener('click', () => {
    copyRichHTML(
      paymentMailHTML,
      paymentMailText,
      document.getElementById('copyPaymentBtn')
    );
  });
