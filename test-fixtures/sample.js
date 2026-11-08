/**
 * Sample test file containing 15+ weak-name scenarios for Naming Helper verification.
 */

// 1. Blocklist: x (variable)
const x = document.getElementById('submit-button');

// 2. Blocklist: temp
let temp = new Date();

// 3. Blocklist: tmp
const tmp = { timeout: 3000 };

// 4. Blocklist: data
const data = await fetch('https://api.example.com/users');

// 5. Blocklist: data2
const data2 = await response.json();

// 6. Blocklist: foo
const foo = 'temporary string';

// 7. Blocklist: bar
let bar = 100;

// 8. Blocklist: baz
const baz = [1, 2, 3];

// 9. Blocklist: val
const val = users.filter((u) => u.isActive);

// 10. Blocklist: res
const res = users.map((u) => u.name);

// 11. Blocklist: arr
const arr = users.find((u) => u.id === 1);

// 12. Blocklist: obj
const obj = { host: 'localhost', port: 8080 };

// 13. Single letter outside allowed context: a
let a = 42;

// 14. Single letter outside allowed context: q
function processQuery(q) {
  return q.trim();
}

// 15. Trailing number: list1 and list2
const list1 = ['apple', 'banana'];
const list2 = ['cherry', 'date'];

// 16. Type contradiction: boolean named 'flag'
const flag = list1.length > 0;

// 17. Type contradiction: array named 'item'
const item = ['first', 'second', 'third'];

