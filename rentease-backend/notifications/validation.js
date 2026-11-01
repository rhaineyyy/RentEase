'use strict';
function normalizePhone(value) {
 let n=String(value || '').replace(/[\s()+-]/g,'');
 if(/^09\d{9}$/.test(n)) n='63'+n.slice(1);
 return /^639\d{9}$/.test(n)?n:null;
}
function allowed(destination, csv, phone=false) {
 return String(csv || '').split(',').map(s=>phone?normalizePhone(s):s.trim().toLowerCase()).filter(Boolean).includes(destination);
}
module.exports={normalizePhone,allowed};
