import test from "node:test";
import assert from "node:assert/strict";
import { navigation, fixtureResponse } from "./wd13-browser-ui-fixture.mjs";

const api = "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
test("four capability fixture profiles stay separate and explicit", () => {
  const emp=navigation("employee");
  const lead=navigation("superuser");
  const admin=navigation("admin");
  const root=navigation("superadmin");
  assert.equal(emp.leave,true); assert.equal(emp.approvals,false);
  assert.equal(lead.approvals,true); assert.equal(lead.admin,false);
  assert.equal(admin.admin,true); assert.equal(admin.adminSettings,false);
  assert.equal(root.adminSettings,true);
  assert.throws(()=>navigation("root"),/Unknown/);
});
test("mock session uses only local chosen fixture role, never a real identity", async () => {
  const res=fixtureResponse(api+"/api/security/session",{headers:{"cookie":"wd13_qa_role=superuser"}});
  const json=await res.json();
  assert.equal(res.status,200);assert.equal(json.navigation.approvals,true);assert.equal(json.navigation.admin,false);
});
test("every other API endpoint is mocked and denied, including writes", async () => {
  for(const path of ["/api/leave/me","/api/medical/claims","/api/admin/settings","/api/desktop-auth/login"]){
    const res=fixtureResponse(api+path,{method:"POST",headers:{"cookie":"wd13_qa_role=superadmin"}});
    assert.equal(res.status,403);
    assert.equal((await res.json()).error,"WD13_LOCAL_MOCK_ONLY");
  }
});
test("fixture does not override tagged TEST Web",()=> {
  assert.equal(fixtureResponse("https://wd11-candidate---ckace-hr-web-test-cjcyhgow2q-as.a.run.app/desktop",{}),null);
});
