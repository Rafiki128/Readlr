import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicy, stagePermitted, OPEN_POLICY } from '../src/modules/admin/classroom.policy.ts';
import { registrationRole } from '../src/modules/auth/adminInvitation.ts';

test('lesson and library grants are validated and never bypass a paused or excluded stage', () => {
  const policy=parsePolicy({...OPEN_POLICY,unlockThrough:{1:5,2:20,3:9},soundLibrary:true});
  assert.deepEqual(policy.unlockThrough,{1:5,2:20,3:9});
  assert.equal(policy.soundLibrary,true);
  assert.equal(stagePermitted({...policy,mode:'paused'},2),false);
  assert.equal(stagePermitted({...policy,mode:'stages',stages:[1]},2),false);
  for(const unlockThrough of [{1:21},{4:5},{1:-1},{1:1.5},{1:'5'},[],null]) assert.throws(()=>parsePolicy({...OPEN_POLICY,unlockThrough}));
  assert.throws(()=>parsePolicy({...OPEN_POLICY,soundLibrary:'true'}));
});

test('admin email pattern requires approved email and a valid private invitation', () => {
  const before = { allowlist: process.env.ADMIN_EMAIL_ALLOWLIST, code: process.env.ADMIN_INVITATION_CODE };
  try {
    process.env.ADMIN_EMAIL_ALLOWLIST = 'd.sabandal@admin.readlr.com';
    process.env.ADMIN_INVITATION_CODE = 'test-only-private-invitation-code';
    assert.equal(registrationRole('student@example.com', undefined), 'learner');
    assert.throws(() => registrationRole('d.sabandal@admin.readlr.com', undefined));
    assert.throws(() => registrationRole('d.sabandal@admin.readlr.com', 'wrong'));
    assert.throws(() => registrationRole('x.stranger@admin.readlr.com', process.env.ADMIN_INVITATION_CODE));
    assert.equal(registrationRole(' D.SABANDAL@ADMIN.READLR.COM ', process.env.ADMIN_INVITATION_CODE), 'admin');
    assert.equal(registrationRole('d.sabandal@readlr.admin.com', process.env.ADMIN_INVITATION_CODE), 'learner');
    process.env.ADMIN_EMAIL_ALLOWLIST += ', t.rentuma@admin.readlr.com, r.abella@admin.readlr.com, a.lapis@admin.readlr.com, n.inoc@admin.readlr.com';
    for (const email of ['t.rentuma', 'r.abella', 'a.lapis', 'n.inoc']) {
      assert.equal(registrationRole(email + '@admin.readlr.com', process.env.ADMIN_INVITATION_CODE), 'admin');
    }
    assert.equal(registrationRole('d.sabandal.admin@readlr.com', process.env.ADMIN_INVITATION_CODE), 'learner');
    assert.equal(registrationRole('d.sabandal@admin.readlr.com.evil.test', process.env.ADMIN_INVITATION_CODE), 'learner');
    process.env.ADMIN_EMAIL_ALLOWLIST += ',invalid@admin.readlr.com';
    assert.throws(() => registrationRole('invalid@admin.readlr.com', process.env.ADMIN_INVITATION_CODE));
    process.env.ADMIN_INVITATION_CODE = 'short';
    assert.throws(() => registrationRole('d.sabandal@admin.readlr.com', 'short'));
  } finally {
    if (before.allowlist === undefined) delete process.env.ADMIN_EMAIL_ALLOWLIST; else process.env.ADMIN_EMAIL_ALLOWLIST = before.allowlist;
    if (before.code === undefined) delete process.env.ADMIN_INVITATION_CODE; else process.env.ADMIN_INVITATION_CODE = before.code;
  }
});

test('classroom stage, pause and survey policies restrict activity while open permits it', () => {
  for (const stage of [1,2,3]) assert.equal(stagePermitted(OPEN_POLICY, stage), true);
  const policy = parsePolicy({ ...OPEN_POLICY, mode: 'stage', stage: 2, message: ' Today: blending ' });
  assert.equal(policy.message, 'Today: blending');
  assert.equal(stagePermitted(policy, 2), true);
  assert.equal(stagePermitted(policy, 1), false);
  assert.equal(stagePermitted({ ...OPEN_POLICY, mode: 'paused' }, 2), false);
  assert.equal(stagePermitted({ ...OPEN_POLICY, mode: 'survey' }, 3), false);
  assert.throws(() => parsePolicy({ ...OPEN_POLICY, mode: 'stage', stage: 4 }));
  assert.throws(() => parsePolicy({ ...OPEN_POLICY, mode: 'other' }));
  assert.throws(() => parsePolicy({ ...OPEN_POLICY, message: 'a'.repeat(241) }));
});

test('selected stages unlock independently and reject empty or invalid selections', () => {
  const policy = parsePolicy({ ...OPEN_POLICY, mode: 'stages', stages: [3, 2, 2] });
  assert.deepEqual(policy.stages, [2, 3]);
  assert.equal(stagePermitted(policy, 1), false);
  assert.equal(stagePermitted(policy, 2), true);
  assert.equal(stagePermitted(policy, 3), true);
  for (const stages of [[], [4], ['2'], null, [1,2,3,4]]) assert.throws(() => parsePolicy({ ...OPEN_POLICY, mode: 'stages', stages }));
  const all = parsePolicy({ ...OPEN_POLICY, mode: 'stages', stages: [1,2,3] });
  for (const stage of [1,2,3]) assert.equal(stagePermitted(all, stage), true);
});

test('survey invitations require an exact approved HTTPS hostname', () => {
  const before = process.env.ADMIN_SURVEY_HOSTS;
  try {
    process.env.ADMIN_SURVEY_HOSTS = 'forms.gle';
    const survey = (url: string) => parsePolicy({ ...OPEN_POLICY, mode: 'survey', surveyUrl: url });
    assert.equal(survey('https://forms.gle/example').surveyUrl, 'https://forms.gle/example');
    for (const url of ['http://forms.gle/example', 'https://forms.gle.evil.test/', 'https://user:password@forms.gle/', 'javascript:alert(1)', 'https://unapproved.test/']) assert.throws(() => survey(url));
  } finally { if (before === undefined) delete process.env.ADMIN_SURVEY_HOSTS; else process.env.ADMIN_SURVEY_HOSTS = before; }
});
