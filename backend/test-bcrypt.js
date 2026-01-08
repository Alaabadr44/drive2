
const bcrypt = require('bcryptjs');

async function test() {
    const password = 'testpassword';
    const hash = await bcrypt.hash(password, 10);
    console.log('Hash:', hash);
    const isValid = await bcrypt.compare(password, hash);
    console.log('IsValid:', isValid);
}

test().catch(console.error);
