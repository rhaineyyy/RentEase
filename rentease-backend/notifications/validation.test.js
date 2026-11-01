const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizePhone,allowed}=require('./validation');
test('PH contact normalization accepts profile and API formats',()=>{
 for(const n of ['09171234567','+639171234567','639171234567']) assert.equal(normalizePhone(n),'639171234567');
 for(const n of ['',null,'123','639171234567,639181234567']) assert.equal(normalizePhone(n),null);
});
test('test recipient restrictions default deny and use exact matches',()=>{
 assert.equal(allowed('639171234567',undefined,true),false);
 assert.equal(allowed('639171234567','09171234567',true),true);
 assert.equal(allowed('a@example.com',' A@EXAMPLE.COM '),true);
 assert.equal(allowed('a@example.com','ba@example.com'),false);
});
