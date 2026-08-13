import assert from 'node:assert/strict';
import {routeAgent} from '../agents.js';

assert.equal(routeAgent('auto', 'sửa lỗi đăng nhập không hoạt động').id, 'fix-bugs');
assert.equal(routeAgent('auto', 'thiết kế giao diện responsive').id, 'ui-ux');
assert.equal(routeAgent('auto', 'thêm unit test và coverage').id, 'qa');
assert.equal(routeAgent('auto', 'tạo API todo').id, 'expert');
assert.equal(routeAgent('architect', 'sửa CSS').id, 'architect');

console.log('Agent router tests: passed');
