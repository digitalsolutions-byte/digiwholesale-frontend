import { DIGIBYSR_LOGO_BASE64 } from './digiBySRLogoData';

export function generateTenantInvoice(tenant) {
    const store = tenant.storeInformation || {};
    const owner = tenant.owner || {};
    const inv   = { ...tenant, ...(tenant.invoiceDetails || {}) };
    const sub   = tenant.subscription || {};
    const defaults = {
        tenantId:       tenant._id || tenant.id || '',
        invoiceNo:      inv.invoiceNo      || tenant.tenantId || '',
        invoiceDate:    inv.invoiceDate
                          ? new Date(inv.invoiceDate).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0],
        hsnSac:         inv.hsnSac         || '998313',
        supplierRef:    inv.supplierRef    || '',
        otherRef:       inv.otherRef       || '',
        buyerName:      store.storeName    || owner.ownerName || '',
        buyerAddress:   store.address      || '',
        buyerGSTIN:     inv.clientGSTIN    || '',
        buyerPAN:       inv.clientPAN      || '',
        buyerState:     inv.clientStateName|| '',
        buyerStateCode: inv.clientStateCode|| '',
        subAmt:         inv.subscriptionAmount != null && inv.subscriptionAmount !== '' ? Number(inv.subscriptionAmount) : '',
        srvAmt:         inv.serverCostAmount   != null && inv.serverCostAmount !== ''   ? Number(inv.serverCostAmount)   : '',
        applyIGST:      Boolean(inv.applyIGST),
        cgstRate:       inv.cgstRate  != null ? Number(inv.cgstRate)  : 9,
        sgstRate:       inv.sgstRate  != null ? Number(inv.sgstRate)  : 9,
        igstRate:       inv.igstRate  != null ? Number(inv.igstRate)  : 18,
        bankName:       inv.bankName       || 'HDFC Bank',
        bankAccNo:      inv.bankAccountNo  || '50200118392316',
        bankBranch:     inv.bankBranch     || 'Hauz Khas, New Delhi',
        bankIFSC:       inv.bankIFSC       || 'HDFC0000467',
        companyPAN:     inv.companyPAN     || 'AAMCD1973C',
        planType:       sub.planType       || 'PRO',
        sellerName:     'DigiBySR Pvt Ltd',
        sellerAddress:  'D-55/C, HAUZ KHAS,\nNEW DELHI -110016',
        sellerGSTIN:    '07AAMCD1973C1ZP',
        sellerState:    'Delhi',
        sellerCode:     '07',
        sellerEmail:    'garima@digibysr.com',
    };

    const logoUrl = DIGIBYSR_LOGO_BASE64 || (window.location.origin + '/digibysr_horizontal.png') || (window.location.origin + '/digibysr.png');
    const D = JSON.stringify(defaults).replace(/<\/script>/gi, '<\\/script>');

    const html = buildInvoiceHTML(D, logoUrl);

    const win = window.open('', '_blank', 'width=1340,height=920');
    if (!win) {
        alert('Please allow popups for this site to generate and view the invoice.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
}

function buildInvoiceHTML(defaultsJSON, logoUrl) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Tax Invoice - GST Preview &amp; Editor</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;background:#f4f7f9;display:flex;min-height:100vh;color:#1e293b}

/* Custom Scrollbar for Panel */
#panel::-webkit-scrollbar{width:5px}
#panel::-webkit-scrollbar-track{background:transparent}
#panel::-webkit-scrollbar-thumb{background-color:#cbd5e1;border-radius:10px}
#panel::-webkit-scrollbar-thumb:hover{background-color:#94a3b8}

#panel{width:320px;min-width:300px;background:#ffffff;color:#1e293b;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0;border-right:1px solid #e2e8f0;box-shadow:2px 0 12px rgba(0,0,0,.03);z-index:50}
#ph{padding:16px 18px 14px;background:#ffffff;border-bottom:1px solid #e2e8f0;border-top:3.5px solid #2980b9;position:sticky;top:0;z-index:10}
#ph .ph-title{display:flex;align-items:center;justify-content:space-between}
#ph h2{font-size:13.5px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px}
#ph .badge{font-size:10px;font-weight:600;background:#ebf5fb;color:#2980b9;padding:2px 8px;border-radius:12px;border:1px solid #d4e6f1}
#ph p{font-size:11px;color:#64748b;margin-top:4px}
.ps{padding:14px 18px;border-bottom:1px solid #f1f5f9}
.ps h3{font-size:10.5px;font-weight:700;color:#1f618d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.ps h3::before{content:'';display:inline-block;width:3px;height:11px;background:#2980b9;border-radius:2px}
.fg{margin-bottom:10px}
.fg label{display:block;font-size:11px;color:#475569;font-weight:600;margin-bottom:4px}
.fg input,.fg select,.fg textarea{width:100%;padding:7px 10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:7px;color:#0f172a;font-size:11.5px;font-weight:500;outline:none;font-family:inherit;transition:all .15s}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:#2980b9;background:#ffffff;box-shadow:0 0 0 3px rgba(41,128,185,.12)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tt{display:flex;flex-direction:column;gap:6px;margin-top:4px}
.tt label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;padding:6px 9px;border-radius:7px;cursor:pointer;transition:all .15s}
.tt label:hover{border-color:#2980b9;background:#ebf5fb}
.tt input[type=radio]{width:13px;height:13px;accent-color:#2980b9}
#pf{padding:14px 18px;background:#ffffff;border-top:1px solid #e2e8f0;display:flex;flex-direction:column;gap:8px;position:sticky;bottom:0;z-index:10;box-shadow:0 -4px 12px rgba(0,0,0,.03)}
.bprint{width:100%;padding:10px;background:linear-gradient(135deg,#2980b9 0%,#1f618d 100%);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 3px 10px rgba(41,128,185,.25);transition:all .2s}
.bprint:hover{background:linear-gradient(135deg,#1f618d 0%,#174a6d 100%);box-shadow:0 4px 14px rgba(41,128,185,.35);transform:translateY(-1px)}
.breset{width:100%;padding:7px;background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s}
.breset:hover{background:#f1f5f9;color:#1e293b;border-color:#cbd5e1}

#pw{flex:1;padding:24px 28px;overflow-y:auto;display:flex;justify-content:center;align-items:flex-start}
.ip{width:210mm;background:#fff;padding:8mm 10mm;box-shadow:0 10px 35px rgba(0,0,0,.12);min-height:297mm;color:#000;font-size:11px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}

/* Precise Tax Invoice Box Layout */
.invoice-box{border:1.5px solid #000;display:flex;flex-direction:column}
.ih-top{display:flex;border-bottom:1.5px solid #000}
.ih-left{flex:1.25;border-right:1.5px solid #000;display:flex;flex-direction:column}
.ih-company{padding:8px 10px;display:flex;align-items:flex-start;gap:12px;border-bottom:1px solid #000;min-height:90px}
.ih-company img{height:44px;max-width:125px;object-fit:contain}
.ih-company-text .cn{font-size:13px;font-weight:bold;margin-bottom:2px}
.ih-company-text .cs{font-size:10px;line-height:1.45}
.ih-buyer{padding:8px 10px;font-size:11px;flex:1;min-height:95px;line-height:1.55}
.ih-buyer .bl{font-size:10px;color:#333}
.ih-buyer .bn{font-size:12px;font-weight:bold;margin-bottom:1px}

.ih-right{flex:1;display:flex;flex-direction:column}
.grid-row{display:flex;border-bottom:1px solid #000}
.grid-cell{flex:1;padding:5px 8px}
.grid-cell.border-r{border-right:1px solid #000}
.grid-cell .label{font-size:9.5px;color:#333;margin-bottom:1px}
.grid-cell .value{font-size:11px;font-weight:bold}
.ih-right-space{flex:1;padding:6px 8px;min-height:80px}

/* Services Table */
.inv-table{width:100%;border-collapse:collapse;border-bottom:1.5px solid #000}
.inv-table th{border:1px solid #000;border-top:none;padding:5px 4px;font-size:10px;font-weight:bold;text-align:center;background:#fff}
.inv-table td{border-left:1px solid #000;border-right:1px solid #000;padding:4px 6px;vertical-align:top;font-size:11px}
.inv-table .total-row td{border-top:1px solid #000;border-bottom:none;font-weight:bold;padding:5px 6px}

/* Chargeable in Words */
.words-row{border-bottom:1.5px solid #000;display:flex;justify-content:space-between;padding:5px 8px;font-size:10.5px}
.words-left strong{font-size:11px}
.words-right{font-style:italic}

/* Tax Table */
.tax-table{width:100%;border-collapse:collapse;border-bottom:1.5px solid #000}
.tax-table th{border:1px solid #000;border-top:none;padding:4px 4px;font-size:9.5px;font-weight:bold;text-align:center}
.tax-table td{border:1px solid #000;padding:4px 6px;font-size:10.5px}
.tax-table .total-tax td{font-weight:bold}

.tax-words-row{border-bottom:1.5px solid #000;padding:5px 8px;font-size:10.5px}

/* Bank & Bottom Details */
.bottom-section{display:flex;border-bottom:1.5px solid #000;min-height:90px}
.bottom-left{flex:1.25;border-right:1.5px solid #000;padding:7px 10px;font-size:10.5px;line-height:1.6}
.bottom-right{flex:1;padding:7px 10px;font-size:10.5px;line-height:1.5}

/* Signature */
.sig-section{display:flex;min-height:75px}
.sig-left{flex:1.25;border-right:1.5px solid #000;padding:7px 10px;display:flex;flex-direction:column;justify-content:flex-end;font-size:10px}
.sig-right{flex:1;padding:7px 10px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;font-size:10px}
.sig-right .sig-company{font-weight:bold;font-size:11px}

@media print{
  body{background:#fff;display:block}
  #panel{display:none!important}
  #pw{padding:0;overflow:visible;display:block}
  .ip{box-shadow:none;margin:0 auto;width:100%;padding:0}
  @page{size:A4 portrait;margin:8mm}
}
</style>
</head>
<body>
<div id="panel">
  <div id="ph">
    <div class="ph-title">
      <h2>Invoice Editor</h2>
      <span class="badge">DigiBySR</span>
    </div>
    <p>Live changes appear instantly on the preview</p>
  </div>

  <div class="ps">
    <h3>Invoice &amp; Ref Details</h3>
    <div class="fg"><label>Invoice No.</label><input id="f_invNo" oninput="render()"/></div>
    <div class="fg"><label>Invoice Date</label><input id="f_invDate" type="date" oninput="render()"/></div>
    <div class="fg"><label>HSN / SAC Code</label><input id="f_hsn" oninput="render()"/></div>
    <div class="fr">
      <div class="fg"><label>Supplier's Ref</label><input id="f_sref" oninput="render()"/></div>
      <div class="fg"><label>Other Ref</label><input id="f_oref" oninput="render()"/></div>
    </div>
    <div class="fg"><label>Tax Scheme</label>
      <div class="tt">
        <label><input type="radio" name="tt" value="intra" onchange="render()"/> CGST + SGST (Intra-State)</label>
        <label><input type="radio" name="tt" value="inter" onchange="render()"/> IGST (Inter-State)</label>
      </div>
    </div>
  </div>

  <div class="ps">
    <h3>Amounts &amp; Taxes</h3>
    <div class="fg"><label>Subscription Amount (&#8377;)</label><input id="f_sub" type="number" min="0" step="0.01" oninput="render()"/></div>
    <div class="fg"><label>Server / Hosting Cost (&#8377;)</label><input id="f_srv" type="number" min="0" step="0.01" oninput="render()"/></div>
    <div id="csgst">
      <div class="fr">
        <div class="fg"><label>CGST Rate (%)</label><input id="f_cgst" type="number" min="0" max="14" oninput="render()"/></div>
        <div class="fg"><label>SGST Rate (%)</label><input id="f_sgst" type="number" min="0" max="14" oninput="render()"/></div>
      </div>
    </div>
    <div id="igst" style="display:none">
      <div class="fg"><label>IGST Rate (%)</label><input id="f_igst" type="number" min="0" max="28" oninput="render()"/></div>
    </div>
  </div>

  <div class="ps">
    <h3>Buyer / Wholesaler</h3>
    <div class="fg"><label>Wholesaler Name</label><input id="f_bname" oninput="render()"/></div>
    <div class="fg"><label>Address</label><textarea id="f_baddr" rows="2" oninput="render()"></textarea></div>
    <div class="fr">
      <div class="fg"><label>GSTIN/UIN</label><input id="f_bgstin" oninput="render()" style="text-transform:uppercase"/></div>
      <div class="fg"><label>PAN</label><input id="f_bpan" oninput="render()" style="text-transform:uppercase"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>State Name</label><input id="f_bstate" oninput="render()"/></div>
      <div class="fg"><label>State Code</label><input id="f_bcode" oninput="render()"/></div>
    </div>
  </div>


  <div id="pf">
    <button class="bprint" onclick="window.print()">Print / Save as PDF</button>
    <button class="breset" onclick="resetF()">Reset to Original</button>
  </div>
</div>

<div id="pw">
  <div class="ip" id="inv"></div>
</div>

<script>
var D=${defaultsJSON};
var LOGO="${logoUrl}";

var SELLER = {
  name: 'DigiBySR Pvt Ltd',
  address: 'D-55/C, HAUZ KHAS,<br/>NEW DELHI -110016',
  gstin: '07AAMCD1973C1ZP',
  state: 'Delhi',
  code: '07',
  email: 'garima@digibysr.com',
  pan: 'AAMCD1973C'
};

var BANK = {
  name: 'HDFC Bank',
  acc: '50200118392316',
  branch: 'Hauz Khas, New Delhi',
  ifsc: 'HDFC0000467'
};

function nw(num){
  var a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function iw(n){
    if(n<20)return a[n];
    if(n<100)return b[Math.floor(n/10)]+(n%10?' '+a[n%10]:'');
    if(n<1000)return a[Math.floor(n/100)]+' Hundred'+(n%100?' '+iw(n%100):'');
    if(n<100000)return iw(Math.floor(n/1000))+' Thousand'+(n%1000?' '+iw(n%1000):'');
    if(n<10000000)return iw(Math.floor(n/100000))+' Lakh'+(n%100000?' '+iw(n%100000):'');
    return iw(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+iw(n%10000000):'');
  }
  var ip=Math.floor(num||0);
  var dp=Math.round(((num||0)-ip)*100);
  var r='INR '+(ip===0?'Zero':iw(ip));
  if(dp>0)r+=' and '+iw(dp)+' Paise';
  return r+' Only';
}

function fmt(n){
  return Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function fd(d){
  if(!d)return '';
  var dt=new Date(d);
  if(isNaN(dt.valueOf()))return d;
  return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}

function v(id){var el=document.getElementById(id);return el?(el.value||''):'';}
function nv(id){return parseFloat(document.getElementById(id).value)||0;}
function isIGST(){var r=document.querySelector('input[name="tt"]:checked');return r&&r.value==='inter';}

function render(){
  var igst=isIGST();
  document.getElementById('csgst').style.display=igst?'none':'';
  document.getElementById('igst').style.display=igst?'':'none';

  var sub=nv('f_sub'), srv=nv('f_srv'), tax=sub+srv;
  var cr=nv('f_cgst'), sr=nv('f_sgst'), ir=nv('f_igst');
  var c=igst?0:tax*cr/100, s=igst?0:tax*sr/100, i=igst?tax*ir/100:0;
  var grand=tax+c+s+i, tt2=c+s+i;

  var sn=SELLER.name, sa=SELLER.address, sg=SELLER.gstin, ss=SELLER.state, sc=SELLER.code, se=SELLER.email;
  var cp=SELLER.pan, ino=v('f_invNo'), idt=fd(v('f_invDate')), hsn=v('f_hsn');
  var sref=v('f_sref'), oref=v('f_oref');
  var bn=v('f_bname'), ba=v('f_baddr').replace(/\\n/g,'<br/>'), bg=v('f_bgstin').toUpperCase(), bp=v('f_bpan').toUpperCase();
  var bst=v('f_bstate'), bsc=v('f_bcode');
  var bk=BANK.name, ac=BANK.acc, br=BANK.branch, ifc=BANK.ifsc;

  var H='';
  H+='<div class="invoice-box">';

  // 1. Top Section (Seller + Buyer on left, Invoice refs on right)
  H+='<div class="ih-top">';
  H+='  <div class="ih-left">';
  H+='    <div class="ih-company">';
  H+='      <img src="'+LOGO+'" onerror="this.style.display=\\'none\\'" alt="Logo"/>';
  H+='      <div class="ih-company-text">';
  H+='        <div class="cn">'+sn+'</div>';
  H+='        <div class="cs">'+sa+'<br/>GSTIN/UIN: '+sg+'<br/>State Name: '+ss+(sc?', Code: '+sc:'')+'<br/>E-Mail: '+se+'</div>';
  H+='      </div>';
  H+='    </div>';
  H+='    <div class="ih-buyer">';
  H+='      <div class="bl">Buyer</div>';
  H+='      <div class="bn">'+bn+'</div>';
  H+='      <div>Address: '+ba+'</div>';
  H+='      <div>GSTIN/UIN &nbsp;: '+(bg||'&mdash;')+'</div>';
  if(bp)H+='<div>PAN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: '+bp+'</div>';
  H+='      <div>State Name: '+(bst||'&mdash;')+(bsc?', Code: '+bsc:'')+'</div>';
  H+='    </div>';
  H+='  </div>';

  H+='  <div class="ih-right">';
  H+='    <div class="grid-row">';
  H+='      <div class="grid-cell border-r"><div class="label">Invoice No.</div><div class="value">'+(ino||'&mdash;')+'</div></div>';
  H+='      <div class="grid-cell"><div class="label">Dated</div><div class="value">'+(idt||'&mdash;')+'</div></div>';
  H+='    </div>';
  H+='    <div class="grid-row">';
  H+='      <div class="grid-cell border-r"><div class="label">Supplier\\'s Ref.</div><div class="value">'+(sref||'')+'</div></div>';
  H+='      <div class="grid-cell"><div class="label">Other Reference(s)</div><div class="value">'+(oref||'')+'</div></div>';
  H+='    </div>';
  H+='    <div class="ih-right-space"></div>';
  H+='  </div>';
  H+='</div>';

  // 2. Services Table
  H+='<table class="inv-table">';
  H+='  <thead>';
  H+='    <tr>';
  H+='      <th style="width:34px">Sl<br/>No.</th>';
  H+='      <th>Description of Services</th>';
  H+='      <th style="width:70px">HSN/SAC</th>';
  H+='      <th style="width:75px">No of<br/>frequency</th>';
  H+='      <th style="width:65px">Rate</th>';
  H+='      <th style="width:45px">per</th>';
  H+='      <th style="width:90px">Amount</th>';
  H+='    </tr>';
  H+='  </thead>';
  H+='  <tbody>';
  H+='    <tr style="height:32px">';
  H+='      <td style="text-align:center">1</td>';
  H+='      <td><strong><em>Wholesale DigiOptics Software</em></strong></td>';
  H+='      <td style="text-align:center">'+hsn+'</td>';
  H+='      <td style="text-align:center">12 Months</td>';
  H+='      <td style="text-align:right"></td>';
  H+='      <td style="text-align:center"></td>';
  H+='      <td style="text-align:right"><strong>'+(sub>0?fmt(sub):'0.00')+'</strong></td>';
  H+='    </tr>';
  if(srv>0){
    H+='    <tr style="height:26px">';
    H+='      <td></td>';
    H+='      <td><strong><em>Server cost</em></strong></td>';
    H+='      <td style="text-align:center"></td>';
    H+='      <td style="text-align:center">12 Months</td>';
    H+='      <td style="text-align:right"></td>';
    H+='      <td style="text-align:center"></td>';
    H+='      <td style="text-align:right"><strong>'+fmt(srv)+'</strong></td>';
    H+='    </tr>';
  } else {
    H+='    <tr style="height:26px"><td></td><td><strong><em>Server cost</em></strong></td><td></td><td style="text-align:center">12 Months</td><td></td><td></td><td style="text-align:right"><strong>0.00</strong></td></tr>';
  }

  // Intermediate blank rows to match tall Tally layout
  H+='    <tr style="height:40px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';

  // Taxes
  if(!igst){
    H+='    <tr>';
    H+='      <td></td>';
    H+='      <td style="text-align:center"><strong><em>CGST @ '+cr+' %</em></strong></td>';
    H+='      <td></td><td></td><td></td><td></td>';
    H+='      <td style="text-align:right"><strong>'+fmt(c)+'</strong></td>';
    H+='    </tr>';
    H+='    <tr>';
    H+='      <td></td>';
    H+='      <td style="text-align:center"><strong><em>SGST @ '+sr+'%</em></strong></td>';
    H+='      <td></td><td></td><td></td><td></td>';
    H+='      <td style="text-align:right"><strong>'+fmt(s)+'</strong></td>';
    H+='    </tr>';
  } else {
    H+='    <tr>';
    H+='      <td></td>';
    H+='      <td style="text-align:center"><strong><em>IGST @ '+ir+'%</em></strong></td>';
    H+='      <td></td><td></td><td></td><td></td>';
    H+='      <td style="text-align:right"><strong>'+fmt(i)+'</strong></td>';
    H+='    </tr>';
  }

  H+='    <tr style="height:25px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';

  // Total Row
  H+='    <tr class="total-row">';
  H+='      <td colspan="6" style="text-align:right;padding-right:12px">Total</td>';
  H+='      <td style="text-align:right">&#8377;&nbsp;<strong>'+fmt(grand)+'</strong></td>';
  H+='    </tr>';
  H+='  </tbody>';
  H+='</table>';

  // 3. Amount Chargeable in words
  H+='<div class="words-row">';
  H+='  <div class="words-left">Amount Chargeable (in words)<br/><strong>'+nw(grand)+'</strong></div>';
  H+='  <div class="words-right">E. &amp; O.E</div>';
  H+='</div>';

  // 4. Tax Breakdown Table
  H+='<table class="tax-table">';
  H+='  <thead>';
  H+='    <tr>';
  H+='      <th rowspan="2" style="width:110px">HSN/SAC</th>';
  H+='      <th rowspan="2" style="width:110px">Taxable<br/>Value</th>';
  if(!igst){
    H+='    <th colspan="2">Central Tax</th>';
    H+='    <th colspan="2">State Tax</th>';
  } else {
    H+='    <th colspan="2">Integrated Tax</th>';
  }
  H+='      <th rowspan="2" style="width:110px">Total<br/>Tax Amount</th>';
  H+='    </tr>';
  H+='    <tr>';
  if(!igst){
    H+='    <th style="width:60px">Rate</th><th style="width:85px">Amount</th>';
    H+='    <th style="width:60px">Rate</th><th style="width:85px">Amount</th>';
  } else {
    H+='    <th style="width:80px">Rate</th><th style="width:110px">Amount</th>';
  }
  H+='    </tr>';
  H+='  </thead>';
  H+='  <tbody>';
  H+='    <tr>';
  H+='      <td style="text-align:center">'+hsn+'</td>';
  H+='      <td style="text-align:right">'+fmt(tax)+'</td>';
  if(!igst){
    H+='    <td style="text-align:center">'+cr+'%</td>';
    H+='    <td style="text-align:right">'+fmt(c)+'</td>';
    H+='    <td style="text-align:center">'+sr+'%</td>';
    H+='    <td style="text-align:right">'+fmt(s)+'</td>';
  } else {
    H+='    <td style="text-align:center">'+ir+'%</td>';
    H+='    <td style="text-align:right">'+fmt(i)+'</td>';
  }
  H+='      <td style="text-align:right">'+fmt(tt2)+'</td>';
  H+='    </tr>';
  H+='    <tr class="total-tax">';
  H+='      <td style="text-align:right">Total</td>';
  H+='      <td style="text-align:right">'+fmt(tax)+'</td>';
  if(!igst){
    H+='    <td></td><td style="text-align:right">'+fmt(c)+'</td>';
    H+='    <td></td><td style="text-align:right">'+fmt(s)+'</td>';
  } else {
    H+='    <td></td><td style="text-align:right">'+fmt(i)+'</td>';
  }
  H+='      <td style="text-align:right">'+fmt(tt2)+'</td>';
  H+='    </tr>';
  H+='  </tbody>';
  H+='</table>';

  // 5. Tax Amount in Words
  H+='<div class="tax-words-row">';
  H+='  Tax Amount (in words) : <strong>'+nw(tt2)+'</strong>';
  H+='</div>';

  // 6. Bottom PAN / Declaration & Bank Details
  H+='<div class="bottom-section">';
  H+='  <div class="bottom-left">';
  if(cp)H+='<div>Company\\'s PAN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>'+cp+'</strong></div>';
  H+='    <div style="margin-top:6px;text-decoration:underline">Declaration</div>';
  H+='    <div>Amount subject to reverse charges = 0.</div>';
  H+='  </div>';
  H+='  <div class="bottom-right">';
  H+='    <div style="font-weight:bold;margin-bottom:2px">Company\\'s Bank Details</div>';
  H+='    <div>Bank Name &nbsp;: <strong>'+bk+'</strong></div>';
  H+='    <div>A/c No. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>'+ac+'</strong></div>';
  H+='    <div>Branch &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: '+br+'</div>';
  H+='    <div style="margin-top:2px"><strong>IFSC Code &nbsp;: '+ifc+'</strong></div>';
  H+='  </div>';
  H+='</div>';

  // 7. Signatures
  H+='<div class="sig-section">';
  H+='  <div class="sig-left">';
  H+='    <div>Customer\\'s Seal and Signature</div>';
  H+='  </div>';
  H+='  <div class="sig-right">';
  H+='    <div class="sig-company">for '+sn+'</div>';
  H+='    <div>Authorised Signatory</div>';
  H+='  </div>';
  H+='</div>';

  H+='</div>'; // end .invoice-box

  document.getElementById('inv').innerHTML=H;
}

function initF(){
  document.getElementById('f_invNo').value = D.invoiceNo || '';
  document.getElementById('f_invDate').value = D.invoiceDate || '';
  document.getElementById('f_hsn').value = D.hsnSac || '998313';
  document.getElementById('f_sref').value = D.supplierRef || '';
  document.getElementById('f_oref').value = D.otherRef || '';

  document.getElementById('f_bname').value = D.buyerName || '';
  document.getElementById('f_baddr').value = D.buyerAddress || '';
  document.getElementById('f_bgstin').value = D.buyerGSTIN || '';
  document.getElementById('f_bpan').value = D.buyerPAN || '';
  document.getElementById('f_bstate').value = D.buyerState || '';
  document.getElementById('f_bcode').value = D.buyerStateCode || '';

  document.getElementById('f_sub').value = D.subAmt !== '' ? D.subAmt : '';
  document.getElementById('f_srv').value = D.srvAmt !== '' ? D.srvAmt : '';
  document.getElementById('f_cgst').value = D.cgstRate != null ? D.cgstRate : 9;
  document.getElementById('f_sgst').value = D.sgstRate != null ? D.sgstRate : 9;
  document.getElementById('f_igst').value = D.igstRate != null ? D.igstRate : 18;

  var r = document.querySelector('input[name="tt"][value="'+(D.applyIGST?'inter':'intra')+'"]');
  if(r) r.checked = true;

  render();
}

function resetF(){
  initF();
}

window.addEventListener('DOMContentLoaded', initF);
</script>
</body>
</html>`;
}
