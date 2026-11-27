import test from 'node:test';
import assert from 'node:assert/strict';
import {canUseLastPolicy, CLASSROOM_POLICY_GRACE_MS, pollDelay, PRESENCE_INTERVAL_MS} from '../src/app/hooks/learnerPolling.ts';

test('only recent policy survives a transient interruption; explicit denials always block',()=>{
  assert.equal(canUseLastPolicy(1000,1001,false),true);
  assert.equal(canUseLastPolicy(1000,1001,true),false);
  assert.equal(canUseLastPolicy(null,1001,false),false);
  assert.equal(canUseLastPolicy(1000,1000+CLASSROOM_POLICY_GRACE_MS,false),false);
});

test('polls spread across a classroom and repeated failures back off',()=>{
  assert.equal(pollDelay(25000,0,0),21250);
  assert.equal(pollDelay(25000,0,1),28750);
  assert.deepEqual([1,2,3,4].map(n=>pollDelay(5000,n,.5)),[10000,20000,40000,40000]);
  assert.equal(PRESENCE_INTERVAL_MS,60000);
});
