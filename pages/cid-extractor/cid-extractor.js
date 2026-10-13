/* CID Extractor — depends on assets/js/common.js (copyText) */

/* =========================================================
   CID EXTRACTOR
========================================================= */

function extractCIDs(){

  const input =
    document
    .getElementById(
      'cidInput'
    )
    .value;


  /*
    CID format:

    F + 10 alphanumeric characters

    Example:
    F08099UY2M3
    F0809ST66SU
    F0809DCF4KA
  */


  const matches =
    input.match(
           /\b[FRCE](?=[A-Z0-9]{10}\b)(?=[A-Z0-9]*\d)[A-Z0-9]{10}\b/gi
    ) || [];


  /*
    Remove duplicates while keeping
    original order.
  */

  const uniqueCIDs =
    [...new Set(
      matches.map(cid =>
        cid.toUpperCase()
      )
    )];


  const output =
    uniqueCIDs.join('\n');


  document.getElementById(
    'cidOutput'
  ).value =
    output;


  document.getElementById(
    'cidCount'
  ).textContent =
    `${uniqueCIDs.length}টি unique CID পাওয়া গেছে`;

}


document
.getElementById(
  'extractCidBtn'
)
.addEventListener(
  'click',
  extractCIDs
);


document
.getElementById(
  'clearCidBtn'
)
.addEventListener(
  'click',
  ()=>{

    document.getElementById(
      'cidInput'
    ).value='';


    document.getElementById(
      'cidOutput'
    ).value='';


    document.getElementById(
      'cidCount'
    ).textContent =
      '0 unique CID পাওয়া গেছে';

  }
);


document
.getElementById(
  'copyCidBtn'
)
.addEventListener(
  'click',
  function(){

    const text =
      document.getElementById(
        'cidOutput'
      ).value;


    if(!text){

      alert(
        'First extract the CID list.'
      );

      return;

    }


    copyText(
      text,
      this
    );

  }
);
